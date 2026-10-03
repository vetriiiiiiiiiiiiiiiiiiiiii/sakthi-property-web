FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY generated ./generated
COPY src ./src
COPY prisma ./prisma
COPY prisma7.config.ts ./
EXPOSE 5000
CMD ["npm", "start"]
