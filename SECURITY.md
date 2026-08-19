# Security Policy for Lotto AI Africa

## 🔒 Security Best Practices

### 1. **Environment Variables** (CRITICAL)
- ✅ **NEVER** commit `.env` file to repository
- ✅ Use `.env.example` as template
- ✅ Store Firebase credentials in GitHub Secrets
- ✅ Use different credentials for dev/staging/production

### 2. **Firebase Configuration**

#### Production Rules (Applied)
```
- ✅ Read-only for public archive data
- ✅ Write restricted to authenticated admin users
- ✅ Rate limiting on forum posts (5 per hour per user)
- ✅ Input validation on all fields
- ✅ XSS protection (no script tags in forum posts)
```

#### Required Setup
1. Replace hardcoded API key in frontend with public-only key
2. Deploy Firestore security rules from `firebase.rules`
3. Enable Firebase Authentication
4. Set up custom claims for admin users

### 3. **Frontend Security**

✅ **Content Security Policy (CSP)**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'">
```

✅ **Input Sanitization**
- All user inputs are sanitized via `sanitizeInput()`
- Forum posts are HTML-escaped before display
- No `innerHTML` used for user-generated content

✅ **CSRF Protection**
- Token-based CSRF protection on forms
- Same-site cookie policy

### 4. **Backend Security**

✅ **Python Scraper**
- Input validation on all parsed data
- Timeout handling for network requests
- Retry logic with exponential backoff
- Logging of all operations
- No hardcoded credentials

### 5. **Admin Portal**

⚠️ **DEPRECATED:** Old PIN-based authentication  
✅ **NEW:** Firebase Authentication required

Implementation:
```javascript
// Use Firebase ID tokens instead of PIN
firebase.auth().onAuthStateChanged(user => {
  if (user && user.getCustomClaims().admin) {
    // Show admin panel
  }
});
```

### 6. **Data Protection**

- ✅ No personal data collected (names, addresses, IDs)
- ✅ No cookies stored without consent
- ✅ GDPR compliant (no tracking without permission)
- ✅ All data stored in Firestore (Google-managed, SOC 2 compliant)

### 7. **HTTPS & Transport**

- ✅ Force HTTPS in Firestore security rules
- ✅ Use secure cookies (httpOnly, secure, sameSite)
- ✅ HSTS headers recommended

### 8. **Dependencies & Vulnerabilities**

**Python:**
```bash
# Check for vulnerabilities
pip install safety
safety check

# Keep dependencies updated
pip install --upgrade-all
```

**JavaScript:**
```bash
# Check npm packages
npm audit
npm audit fix
```

### 9. **Logging & Monitoring**

✅ All operations logged to `logs/lotto_ai.log`
✅ Sensitive data (API keys) never logged
✅ Errors logged with full stack traces
✅ Recommend: Enable Firebase Cloud Logging

### 10. **Incident Response**

If you suspect a security breach:

1. **Immediately:**
   - [ ] Rotate Firebase API keys
   - [ ] Revoke admin access tokens
   - [ ] Clear browser cache/localStorage

2. **Within 24 hours:**
   - [ ] Review Firestore access logs
   - [ ] Check for unauthorized data modifications
   - [ ] Notify users (if applicable)

3. **Follow-up:**
   - [ ] Conduct security audit
   - [ ] Update security rules
   - [ ] Document incident and lessons learned

---

## 🔐 Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured in GitHub Actions
- [ ] Firestore security rules deployed
- [ ] Firebase authentication enabled
- [ ] CSP headers configured
- [ ] HTTPS certificate installed
- [ ] CORS policies set
- [ ] Rate limiting enabled
- [ ] Admin users configured with custom claims
- [ ] Backup system in place
- [ ] Monitoring alerts configured
- [ ] Security audit passed

---

## 📞 Security Contact

**Email:** [dumbiri257@gmail.com](mailto:dumbiri257@gmail.com)  
**Report vulnerabilities confidentially** - do not open public issues

---

**Last Updated:** 2026-08-19  
**Version:** 1.0
