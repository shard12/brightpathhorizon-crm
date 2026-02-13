# 🌟 BrightPathHorizon CRM
### Complete Lead Management System

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup database
mysql -u root -p < config/database.sql

# 3. Configure environment
cp .env.example .env
# Edit .env with your DB credentials

# 4. Start development server
npm run dev

# App runs at: http://localhost:3000
```

### Default Admin Login
```
Email:    admin@brightpathhorizon.com
Password: Admin@123
```
**⚠️ Change this password immediately after first login!**

---

## 📁 Project Structure

```
brightpathhorizon-crm/
├── config/
│   ├── db.js              # MySQL connection pool
│   └── database.sql       # DB schema + seed
├── middleware/
│   └── auth.js            # Auth guards (isAuthenticated, isAdmin, isGuest)
├── public/
│   ├── css/style.css      # All styles
│   └── js/app.js          # Frontend JS
├── routes/
│   ├── auth.js            # Login / Register / Logout
│   ├── dashboard.js       # Dashboard + Admin user mgmt
│   └── leads.js           # Full lead CRUD + Excel export
├── views/
│   ├── partials/
│   │   ├── header.ejs     # Sidebar + topbar
│   │   └── footer.ejs     # Scripts closing tags
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── leads/
│   │   ├── index.ejs      # Lead list with filters
│   │   └── form.ejs       # Add/Edit lead form
│   ├── admin/
│   │   └── users.ejs      # User management
│   ├── dashboard.ejs
│   ├── 404.ejs
│   └── error.ejs
├── server.js              # Express app entry point
├── package.json
└── .env.example
```

---

## 🌐 Deployment Guide

---

### Option A: Render (Recommended — Free Tier)

**1. Prepare your code**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/brightpathhorizon-crm.git
git push -u origin main
```

**2. Set up MySQL database (PlanetScale or Aiven)**
- Go to [planetscale.com](https://planetscale.com) → Create free DB → `brightpathhorizon`
- Get the connection string (HOST, USER, PASSWORD, DB name)
- Run `database.sql` via their console

**3. Deploy on Render**
- Go to [render.com](https://render.com) → New Web Service
- Connect your GitHub repo
- Set these settings:
  ```
  Build Command:  npm install
  Start Command:  node server.js
  Node Version:   18
  ```
- Add Environment Variables:
  ```
  NODE_ENV=production
  PORT=3000
  DB_HOST=your-planetscale-host
  DB_USER=your-db-user
  DB_PASSWORD=your-db-password
  DB_NAME=brightpathhorizon
  SESSION_SECRET=a-very-long-random-secret-string-here
  ```
- Click **Deploy**

---

### Option B: Railway

**1. Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

**2. Create project**
```bash
railway init
railway add mysql    # Adds managed MySQL
```

**3. Set env vars**
```bash
railway variables set NODE_ENV=production
railway variables set SESSION_SECRET=your-secret-here
# DB vars auto-set by Railway MySQL plugin
```

**4. Deploy**
```bash
railway up
```

---

### Option C: VPS (Ubuntu + PM2 + Nginx)

**Step 1: Server setup**
```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

**Step 2: MySQL setup**
```bash
sudo mysql -u root -p

# In MySQL:
CREATE DATABASE brightpathhorizon;
CREATE USER 'bphuser'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON brightpathhorizon.* TO 'bphuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import schema
mysql -u bphuser -p brightpathhorizon < /var/www/crm/config/database.sql
```

**Step 3: Deploy application**
```bash
# Clone your code
sudo mkdir -p /var/www/crm
cd /var/www/crm
git clone https://github.com/yourusername/brightpathhorizon-crm.git .

# Install dependencies
npm install --production

# Create .env file
nano .env
# Fill in your production values

# Start with PM2
pm2 start server.js --name "brightpath-crm"
pm2 save
pm2 startup    # Copy and run the outputted command to auto-start on reboot
```

**Step 4: Nginx configuration**
```bash
sudo nano /etc/nginx/sites-available/brightpath-crm
```

Paste this config:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/brightpath-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Step 5: SSL Certificate (Free with Let's Encrypt)**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Follow prompts — SSL auto-renews!
```

**Step 6: Useful PM2 commands**
```bash
pm2 status                    # Check app status
pm2 logs brightpath-crm       # View logs
pm2 restart brightpath-crm    # Restart app
pm2 stop brightpath-crm       # Stop app
pm2 monit                     # Live monitoring dashboard
```

---

## 🔒 Security Checklist Before Going Live

- [ ] Change default admin password
- [ ] Set a strong SESSION_SECRET (64+ random chars)
- [ ] Set NODE_ENV=production
- [ ] Use SSL (HTTPS)
- [ ] Restrict MySQL user to minimum needed privileges
- [ ] Set up regular database backups
- [ ] Review CORS/helmet settings for API exposure

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| express | Web framework |
| mysql2 | MySQL driver (promises support) |
| bcryptjs | Password hashing |
| express-session | Session management |
| connect-flash | Flash messages |
| ejs | HTML templating |
| exceljs | Excel export |
| moment | Date formatting |
| method-override | PUT/DELETE via HTML forms |
| dotenv | Environment variables |

---

## 🛠 Development Commands

```bash
npm run dev    # Start with nodemon (auto-reload)
npm start      # Production start
```

---

## 🔮 Future Enhancements

- [ ] Email reminders via Nodemailer
- [ ] WhatsApp follow-up via Twilio API
- [ ] Lead scoring with AI
- [ ] PDF proposal generation
- [ ] Multi-company SaaS with subdomain routing
- [ ] Mobile app with React Native
- [ ] Dashboard charts with Chart.js
- [ ] Lead import via Excel upload

---

*Built for BrightPathHorizon Technologies · Node.js + MySQL + Express*
