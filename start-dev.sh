
#!/bin/bash

echo "🚀 Starting DHA Back Office Server..."

# Start the server in production mode
NODE_ENV=production node server/index.js
