package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const secret = "0123456789abcdef0123456789abcdef"

func TestSignVerifyRoundTrip(t *testing.T) {
	i := NewIssuer(secret, time.Hour)
	tok, exp, err := i.Sign("admin")
	if err != nil {
		t.Fatal(err)
	}
	if time.Until(exp) < 59*time.Minute {
		t.Fatalf("expiry too soon: %v", exp)
	}
	user, err := i.Verify(tok)
	if err != nil || user != "admin" {
		t.Fatalf("Verify = %q, %v", user, err)
	}
}

func TestVerifyRejects(t *testing.T) {
	i := NewIssuer(secret, time.Hour)
	good, _, _ := i.Sign("admin")

	forge := func(method jwt.SigningMethod, key any, claims jwt.RegisteredClaims) string {
		s, err := jwt.NewWithClaims(method, claims).SignedString(key)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	valid := jwt.RegisteredClaims{
		Issuer: tokenIssuer, Subject: "admin", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}

	expired := valid
	expired.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Minute))
	noExp := valid
	noExp.ExpiresAt = nil
	wrongIssuer := valid
	wrongIssuer.Issuer = "someone-else"
	noSubject := valid
	noSubject.Subject = ""

	cases := map[string]string{
		"empty":           "",
		"garbage":         "not-a-jwt",
		"tampered":        good[:len(good)-2] + "xx",
		"wrong secret":    forge(jwt.SigningMethodHS256, []byte("another-secret-another-secret-123456"), valid),
		"alg none":        forge(jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, valid),
		"other hmac alg":  forge(jwt.SigningMethodHS512, []byte(secret), valid),
		"expired":         forge(jwt.SigningMethodHS256, []byte(secret), expired),
		"missing expiry":  forge(jwt.SigningMethodHS256, []byte(secret), noExp),
		"wrong issuer":    forge(jwt.SigningMethodHS256, []byte(secret), wrongIssuer),
		"missing subject": forge(jwt.SigningMethodHS256, []byte(secret), noSubject),
	}
	for name, tok := range cases {
		if _, err := i.Verify(tok); err == nil {
			t.Errorf("%s: token was accepted", name)
		}
	}
}

func TestTokenExpiresWithClock(t *testing.T) {
	i := NewIssuer(secret, time.Minute)
	now := time.Now()
	i.now = func() time.Time { return now }
	tok, _, _ := i.Sign("admin")

	i.now = func() time.Time { return now.Add(30 * time.Second) }
	if _, err := i.Verify(tok); err != nil {
		t.Fatalf("should still be valid: %v", err)
	}
	i.now = func() time.Time { return now.Add(2 * time.Minute) }
	if _, err := i.Verify(tok); err == nil {
		t.Fatal("token should have expired")
	}
}

func TestPasswordHashing(t *testing.T) {
	h, err := HashPassword("correct horse")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(h, "correct horse") || !CheckPassword(h, "correct horse") || CheckPassword(h, "wrong") {
		t.Fatal("password hashing misbehaves")
	}
}

func TestLimiter(t *testing.T) {
	l := NewLimiter(3, time.Minute)
	now := time.Now()
	l.now = func() time.Time { return now }

	for n := 0; n < 3; n++ {
		if !l.Allow("a") {
			t.Fatalf("attempt %d should be allowed", n+1)
		}
	}
	if l.Allow("a") {
		t.Fatal("4th attempt should be blocked")
	}
	if !l.Allow("b") {
		t.Fatal("other keys are independent")
	}
	now = now.Add(61 * time.Second)
	if !l.Allow("a") {
		t.Fatal("window should have reset")
	}
}
