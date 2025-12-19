# Server Deployment Guide

Your invoice system is now built and ready to deploy! The production files are in the `out/` folder.

## Option 1: Simple HTTP Server (Quick Test)

For quick testing on your local network:

```bash
# Install serve globally (one time)
npm install -g serve

# Serve the built application
npx serve out -p 80
```

Access from any device on your network: `http://YOUR_IP_ADDRESS`

## Option 2: Windows IIS Server

### Steps:
1. **Install IIS:**
   - Open "Turn Windows features on or off"
   - Enable "Internet Information Services"
   - Enable "World Wide Web Services"

2. **Copy Files:**
   - Copy entire `out/` folder to `C:\inetpub\wwwroot\invoices\`

3. **Create Website:**
   - Open IIS Manager
   - Right-click "Sites" → "Add Website"
   - Site name: `InvoiceSystem`
   - Physical path: `C:\inetpub\wwwroot\invoices`
   - Port: `80` (or `8080`)

4. **Configure MIME Types:**
   - Select your site → "MIME Types"
   - Add: `.json` → `application/json`

5. **Access:**
   - `http://localhost` or `http://YOUR_SERVER_IP`

## Option 3: Apache/Nginx (Linux Server)

### Apache:
```bash
# Copy files to web root
sudo cp -r out/* /var/www/html/invoices/

# Create .htaccess for routing
cat > /var/www/html/invoices/.htaccess << 'EOF'
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
EOF

# Restart Apache
sudo systemctl restart apache2
```

### Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/invoices;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Option 4: Cloud Hosting (Free/Paid)

### Vercel (Recommended - Free):
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Netlify (Free):
1. Go to https://netlify.com
2. Drag and drop `out/` folder
3. Site is live instantly!

### AWS S3 + CloudFront:
```bash
# Install AWS CLI
# Configure: aws configure

# Upload to S3
aws s3 sync out/ s3://your-bucket-name --acl public-read

# Enable static website hosting in S3 settings
```

## Option 5: Node.js Server (Production)

Since your app is static, you can also run with Node:

```bash
# Production mode
npm start
```

Or create a production server:

**server.js:**
```javascript
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('out'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'out', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Then:
```bash
npm install express
node server.js
```

## Option 6: Docker Container

**Dockerfile:**
```dockerfile
FROM nginx:alpine
COPY out/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t invoice-system .
docker run -d -p 80:80 invoice-system
```

## Important Notes

### LocalStorage Persistence:
- Data is stored in browser localStorage
- Each user's browser has their own data
- For shared database, you'll need to add a backend

### For Production Use:
1. **Use HTTPS** - Get free SSL from Let's Encrypt
2. **Regular Backups** - Export invoices regularly (JSON export feature)
3. **Access Control** - Add authentication if needed
4. **Database** - Consider adding MongoDB/PostgreSQL for shared access

### Recommended for Business:
- **VPS Server** (DigitalOcean, Linode, AWS): $5-10/month
- **Domain Name**: ~$12/year
- **SSL Certificate**: Free (Let's Encrypt)

## Quick Deploy Now:

```bash
# Simplest option - Serve locally
npx serve out -p 3000
```

Then access at: `http://localhost:3000`

From other computers on same network: `http://YOUR_IP:3000`

## Need Help?

For specific deployment help, provide:
1. What type of server? (Windows/Linux/Cloud)
2. Existing hosting? (Yes/No)
3. Domain name? (Yes/No)
4. Budget? (Free/Paid)
