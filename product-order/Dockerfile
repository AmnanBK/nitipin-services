# ===================================
# STAGE 1: Builder
# Tujuan: Install semua dependency dan kompilasi TypeScript ke JavaScript
# ===================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy file definisi dependency terlebih dahulu (trik caching Docker layer)
# Jika package.json tidak berubah, Docker akan menggunakan cache dan SKIP 'npm install'
COPY package*.json ./

# Install SEMUA dependency (termasuk devDependencies karena butuh TypeScript untuk build)
RUN npm install

# Copy seluruh source code
COPY . .

# Kompilasi TypeScript -> JavaScript (output ke folder /dist)
RUN npm run build

# ===================================
# STAGE 2: Runner
# Tujuan: Image production yang ringan, hanya berisi file JS hasil kompilasi
# ===================================
FROM node:20-alpine AS runner

WORKDIR /app

# Hanya copy file dependency (bukan devDependencies) untuk production
COPY package*.json ./
RUN npm install --omit=dev

# Hanya copy hasil kompilasi dari stage builder (bukan source TypeScript)
COPY --from=builder /app/dist ./dist

# Expose port yang digunakan Express
EXPOSE 8083

# Perintah untuk menjalankan aplikasi saat Container hidup
CMD ["node", "dist/server.js"]
