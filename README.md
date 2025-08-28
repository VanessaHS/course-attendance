# 📚 University Course Attendance Tracker

A **zero-cost, privacy-focused** attendance tracking solution designed specifically for university courses. This system allows instructors to track student attendance while minimizing privacy concerns and requiring no paid services.

## 🎯 Key Features

- **Zero Cost**: Runs entirely in the browser, can be hosted for free
- **Privacy First**: Minimal data collection, anonymous options available
- **Location Verification**: Session-based QR codes and optional location services
- **Real-time Tracking**: Live attendance monitoring during class
- **Offline Capable**: Works without internet once loaded
- **Export Ready**: CSV export for record keeping

## 🔒 Privacy & Data Protection

### Privacy-Conscious Design
- **Minimal Data Collection**: Only collects student identifiers and timestamps
- **Anonymous Mode**: Students can use nicknames or anonymous IDs instead of real names
- **Local Storage Only**: All data stored in browser localStorage (no external servers)
- **No Tracking**: No analytics, cookies, or third-party tracking
- **Optional Location**: Location services are opt-in and not stored permanently
- **Auto-Delete**: Optional automatic deletion of data after 90 days

### GDPR/FERPA Compliance Features
- Transparent data collection with clear purpose
- Minimal data retention periods
- Easy data export (CSV format)
- Simple data deletion options
- No data sharing with third parties
- Student control over their identifiers

### What Data Is Collected
1. **Student Identifier** (name, student ID, or anonymous identifier - student's choice)
2. **Check-in/Check-out timestamps**
3. **Session information** (course name, date, session code)
4. **Optional location data** (only for verification, not stored)

## 🚀 Quick Start Guide

### Option 1: GitHub Pages (Free Hosting)

1. **Fork or download this repository**
2. **Enable GitHub Pages** in repository settings
3. **Access via the GitHub Pages URL**
4. **Share the URL with students**

### Option 2: Local Development/Testing

1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   cd UniversityCourseAttendance
   ```

2. **Serve the files locally**:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Or simply open index.html in a modern web browser
   ```

3. **Access the application**:
   - Student interface: `http://localhost:8000/index.html`
   - Admin interface: `http://localhost:8000/admin.html`

### Option 3: Free Static Hosting Services

Deploy to any of these free static hosting services:
- **Netlify**: Drag and drop the folder to Netlify
- **Vercel**: Connect your GitHub repository
- **GitHub Pages**: Enable in repository settings
- **Surge.sh**: Use `surge` command-line tool

## 📋 How to Use

### For Instructors

1. **Access Admin Panel**: Open `admin.html`

2. **Create a Session**:
   - Enter course name
   - Select date (defaults to today)
   - Click "Generate New Session"
   - Display the QR code in your classroom

3. **Monitor Attendance**:
   - View live attendance as students check in
   - See who's currently present vs. who has left
   - Monitor session duration

4. **Export Data**:
   - Click "Export Data (CSV)" for records
   - Data includes all sessions and student attendance

5. **Privacy Settings**:
   - Enable anonymous mode if desired
   - Set auto-delete for data retention compliance

### For Students

1. **Access Student Interface**: Open `index.html` or scan QR code

2. **Check In**:
   - Enter your identifier (name, student ID, or anonymous ID)
   - Enter session code (displayed by instructor or scan QR)
   - Click "Check In"

3. **Check Out** (when leaving):
   - Use the same session code
   - Click "Check Out"

4. **View Your Attendance**:
   - See your check-ins for the day
   - View total time spent in class

## 🔧 Technical Details

### System Architecture
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: Browser localStorage (client-side only)
- **QR Codes**: QRCode.js library
- **No Backend**: Fully client-side application
- **No Database**: Data stored locally in each user's browser

### Enhanced Security & Location Verification

#### Multi-Layer Security System
1. **Time-Rotating QR Codes**: 
   - Codes change every 3 minutes automatically
   - Screenshots become invalid quickly
   - Prevents remote check-outs using saved codes

2. **Location-Based Check-Out Verification**:
   - GPS verification required for all check-outs
   - Accuracy requirement (within 50 meters)
   - Cannot check out remotely even with valid codes

3. **Time-Based Restrictions**:
   - Minimum 5-minute stay requirement
   - Prevents "drive-by" attendance
   - Ensures actual class participation

4. **Session Validation**:
   - Stricter validation for check-outs vs. check-ins
   - Current time-slot required for check-outs
   - Previous time-slot allowed for check-ins (timing tolerance)

5. **Manual Override Controls**:
   - Instructor can manually check out students
   - Useful for technical issues or emergencies
   - Logged for audit purposes

### Data Storage Structure

Data is stored in browser localStorage with this structure:
```javascript
{
  "attendance_data": {
    "2024-01-15": {
      "ABC123": {
        "sessionInfo": { /* session details */ },
        "students": {
          "John Doe": {
            "checkIn": "2024-01-15T10:00:00.000Z",
            "checkOut": "2024-01-15T11:30:00.000Z"
          }
        }
      }
    }
  }
}
```

## 🛡️ Enhanced Security Measures

### ⚠️ Problem Solved: Photo-Based Check-Out Abuse
**Original Issue**: Students could photograph QR codes and check out remotely.

**Solution Implemented**: Multi-layer security system that makes this impossible:

### Session Security
- **Time-Rotating Codes**: QR codes change every 3 minutes (base-code + rotation suffix)
- **Timestamp Validation**: Check-outs require current time-slot validation
- **Location Verification**: GPS required for all check-outs (50m accuracy)
- **Minimum Stay Time**: Students must wait 5 minutes before checking out
- **Session Expiration**: Base sessions expire after 8 hours
- **Date Validation**: Codes only work for the intended date

### Check-Out Security Specifically
1. **Real-Time Code Requirements**: Screenshots won't work - code must be current
2. **GPS Verification**: Must be physically present for location check
3. **Time Constraints**: Cannot check out immediately after check-in
4. **Accuracy Requirements**: Location must be within 50 meters
5. **Instructor Override**: Manual check-out available for legitimate issues

### Privacy Protection
- **No Personal Data Required**: Students can use any identifier
- **Local Storage Only**: Data never leaves the user's device
- **No Network Transmission**: All processing happens locally
- **Transparent Operation**: All code is open and auditable
- **Location Privacy**: GPS data used only for verification, not stored

## 📊 Features Overview

### For Students
- ✅ Simple check-in/check-out process
- 🔒 Privacy-protected identifier entry
- 📱 QR code scanning support
- 📍 Optional location verification
- 📊 Personal attendance summary
- ⚡ Works offline once loaded

### for Instructors
- 🎯 Session generation and management
- 📱 QR code generation for classroom display
- 👥 Real-time attendance monitoring
- 📈 Attendance statistics and history
- 📤 CSV export for record keeping
- 🔧 Privacy settings management
- 🗑️ Data retention controls

## 🔍 Troubleshooting

### Common Issues

1. **QR Code Not Scanning**: Ensure camera permissions are enabled in browser

2. **Data Not Saving**: Check browser localStorage permissions

3. **Session Code Invalid**: Verify the code is current and entered correctly

4. **Location Services Not Working**: Grant location permissions when prompted

### Browser Compatibility
- Chrome 60+ ✅
- Firefox 55+ ✅
- Safari 12+ ✅
- Edge 79+ ✅

## 🤝 Contributing

This is an open-source project designed for educational institutions. Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is designed for educational use. Feel free to modify and adapt for your institution's needs.

## ⚠️ Important Notes

- **Backup Data**: Export attendance data regularly as it's stored locally
- **Browser Storage**: Data is tied to the specific browser/device
- **Privacy Laws**: Ensure compliance with local privacy regulations
- **Student Consent**: Inform students about data collection practices
- **Accessibility**: Test with screen readers and accessibility tools if needed

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Ensure all files are served over HTTP(S) protocol
4. Verify localStorage is enabled in browser settings

---

**Built with privacy, simplicity, and education in mind.** 🎓
