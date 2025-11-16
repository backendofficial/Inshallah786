#!/bin/bash
# Git pull and push script

echo "🔄 Pulling from GitHub with rebase..."
git pull --rebase origin main

echo ""
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Changes synced with GitHub"
git log --oneline -3
