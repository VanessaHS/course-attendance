# 🚀 Deployment Guide

Quick deployment instructions for hosting your Course Attendance Tracker for free.

## ⚡ Option 1: GitHub Pages (Recommended)

**Perfect for institutional use with version control**

1. **Create GitHub Repository**:
   ```bash
   # Upload your files to a new GitHub repository
   git init
   git add .
   git commit -m "Initial attendance tracker setup"
   git remote add origin https://github.com/yourusername/course-attendance.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from branch"
   - Choose "main" branch, "/ (root)" folder
   - Click "Save"

3. **Access Your Site**:
   - URL: `https://yourusername.github.io/course-attendance/`
   - Student interface: `[URL]/index.html`
   - Admin interface: `[URL]/admin.html`

## 📁 Option 2: Netlify

**Great for drag-and-drop deployment**

1. **Visit** [netlify.com](https://netlify.com)
2. **Drag and drop** your project folder to the deploy area
3. **Get your URL**: Netlify provides a random URL (can be customized)
4. **Custom domain**: Add your institution's domain if desired

## ⚙️ Option 3: Vercel

**Perfect for GitHub integration**

1. **Visit** [vercel.com](https://vercel.com)
2. **Connect your GitHub** repository
3. **Deploy**: Automatic deployment from your repo
4. **URL**: Get your vercel.app URL

## 🌐 Option 4: Local Network Deployment

**For classroom-only use without internet**

### Using Python (if installed):
```bash
cd /path/to/your/attendance/folder
python -m http.server 8000
```
Access at: `http://[your-ip]:8000`

### Using Node.js:
```bash
npx http-server
```

### Using PHP (if installed):
```bash
php -S localhost:8000
```

## 📱 Custom Domain Setup

### For GitHub Pages:
1. Add a `CNAME` file with your domain
2. Configure DNS to point to GitHub Pages
3. Enable HTTPS in repository settings

### For Netlify/Vercel:
1. Add custom domain in dashboard
2. Configure DNS as instructed
3. Automatic SSL certificate

## 🔧 Configuration Tips

### 1. Update URLs in QR Codes
- Edit `admin.js` line with `baseUrl` if needed
- Test QR code generation with your deployed URL

### 2. Customize Branding
- Update page titles in HTML files
- Modify course name defaults
- Add your institution's colors/logo

### 3. Privacy Considerations
- Add privacy policy link if required
- Include data retention information
- Consider GDPR/FERPA compliance notices

## ✅ Post-Deployment Checklist

- [ ] **Test student check-in flow**
- [ ] **Verify admin panel access**
- [ ] **Test QR code generation**
- [ ] **Check data export functionality**
- [ ] **Verify mobile responsiveness**
- [ ] **Test on different browsers**
- [ ] **Confirm privacy settings work**

## 🚨 Security Notes

1. **HTTPS Required**: Ensure your deployment uses HTTPS for:
   - Location services
   - Camera access (QR scanning)
   - General security

2. **Admin Access**: Consider restricting admin panel access if needed:
   - Password protection at hosting level
   - IP restrictions
   - Separate admin URL

3. **Data Backup**: Since data is stored locally:
   - Regular CSV exports
   - Clear data retention policies
   - Backup procedures for instructors

## 📞 Support Resources

- **GitHub Pages**: [docs.github.com/pages](https://docs.github.com/pages)
- **Netlify**: [docs.netlify.com](https://docs.netlify.com)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)

---
*Ready to go live? Choose your deployment method and get started! 🎓*
