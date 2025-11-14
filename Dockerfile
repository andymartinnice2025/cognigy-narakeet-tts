FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --only=production

# Bundle app source
COPY . .

# Cloud Run expects the container to listen on $PORT
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]
