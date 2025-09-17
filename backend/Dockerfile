FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "development" ]; then npm install; else npm install --production; fi
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
