FROM node:18-alpine
WORKDIR /app

# 의존성 먼저 (레이어 캐시 최적화)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 소스 코드
COPY index.js oauth.js setup-worker.js ./
COPY categories.json ./

# 런타임 데이터 파일은 볼륨으로 마운트 (accounts.enc.json, settings.enc.json 등)

EXPOSE 8766
CMD ["node", "index.js"]
