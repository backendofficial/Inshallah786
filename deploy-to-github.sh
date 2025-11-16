#!/bin/bash
# DEPLOY TO GITHUB - FINAL PRODUCTION

echo "🚀 Deploying DHA Back Office to GitHub..."
echo ""

cd /workspaces/Inshallah786 || exit 1

echo "📝 Staging all files..."
git add .

echo "✅ Committing changes..."
git commit -m "Production Release: Complete DHA Back Office with all interfaces, 13 permits, APIs configured, main interface fixed"

echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Next steps:"
echo "1. Go to: https://dashboard.render.com"
echo "2. Click your service"
echo "3. Click 'Deploy' button"
echo "4. Wait 10 minutes"
echo ""
echo "Then test:"
echo "curl https://inshallah786-y0lf.onrender.com/"
echo ""
echo "Your system will be LIVE! 🎉"
