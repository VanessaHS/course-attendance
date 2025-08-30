# 🔐 Admin Security Setup Guide

## Setting Your Admin Password

The admin portal is now secured with password authentication. Follow these steps to set up your admin password:

### 1. Generate Your Password Hash

**Current Default**: The system uses "hello" as the default password (for testing only).

**To set your own password**, you need to generate a SHA-256 hash:

#### Option A: Use Online SHA-256 Generator
1. Go to any SHA-256 hash generator (search "SHA-256 hash generator")
2. Enter your desired password
3. Copy the resulting hash

#### Option B: Use Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Run this code with your password:
```javascript
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Replace "YourSecurePassword123" with your actual password
hashPassword("YourSecurePassword123").then(hash => console.log("Your hash:", hash));
```

### 2. Update the Admin Configuration

Edit `admin.js` and find this line (around line 14):
```javascript
ADMIN_PASSWORD_HASH: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
```

Replace the hash with your generated hash:
```javascript
ADMIN_PASSWORD_HASH: 'your-generated-hash-here'
```

### 3. Security Features Implemented

✅ **Password Protection**: Admin panel requires password authentication
✅ **Session Management**: 4-hour session timeout with automatic extension
✅ **Rate Limiting**: Max 3 login attempts per 15 minutes
✅ **Secure Headers**: CSP, X-Frame-Options, and other security headers
✅ **Session Monitoring**: Automatic logout when session expires
✅ **Logout Button**: Manual logout option in top-right corner

### 4. Important Security Notes

⚠️ **Change the Default Password**: The default "hello" password is only for testing
⚠️ **Use HTTPS**: Always deploy over HTTPS, never HTTP
⚠️ **Keep Hash Secret**: Never commit your password hash to version control
⚠️ **Regular Updates**: Consider changing the password periodically

### 5. How It Works

1. **First Access**: Users see a login screen when accessing `admin.html`
2. **Authentication**: Password is hashed and compared to stored hash
3. **Session Creation**: Valid login creates a 4-hour session
4. **Auto-Extension**: Session extends automatically during active use
5. **Auto-Logout**: Session expires after 4 hours of inactivity
6. **Rate Limiting**: Failed attempts are tracked and limited

### 6. Troubleshooting

**Can't Access Admin Panel?**
- Check that you're using the correct password
- Wait 15 minutes if you've exceeded login attempts
- Clear browser localStorage if needed: `localStorage.clear()`

**Forgot Your Password?**
- Generate a new hash using the methods above
- Update the `ADMIN_PASSWORD_HASH` in `admin.js`
- Refresh the page

### 7. Next Steps

After setting up admin authentication, consider implementing:
1. GitHub token security improvements
2. Enhanced session code security
3. Input validation and sanitization
4. Additional audit logging

---

**Security Status**: 🔐 **ADMIN PORTAL SECURED**
- ✅ Authentication Required
- ✅ Session Management Active  
- ✅ Rate Limiting Enabled
- ✅ Security Headers Applied
