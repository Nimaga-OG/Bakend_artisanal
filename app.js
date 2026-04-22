const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { handleUploadError } = require('./middleware/upload');

require('dotenv').config();

// ✅ Initialiser express
const app = express();

// ✅ Créer un serveur HTTP à partir de Express
const server = http.createServer(app);

// ✅ Configuration CORS plus complète
const corsOptions = {
  origin: ['http://localhost:8100', 'http://localhost:5000', 'http://localhost:4200','http://192.168.246.108:8100','http://192.168.16.115:8100'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
};

// ✅ Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Augmenter la limite pour les images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, 'public')));
// ✅ Route de santé pour tester le serveur
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'Serveur fonctionnel', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ✅ Routes API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/utilisateurs', require('./routes/utilisateur.routes'));
app.use('/api/produits', require('./routes/produit.routes'));
app.use('/api/commandes', require('./routes/commande.routes'));

app.use('/api/categories', require('./routes/categorie.routes'));
app.use('/api/admin', require('./routes/admin.routes'));


// ✅ Middleware de gestion d'erreurs d'upload
app.use(handleUploadError);

// ✅ Initialiser Socket.io avec une configuration plus complète
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8100', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// ✅ Stocker les utilisateurs connectés
const connectedUsers = new Map();

// ✅ Gestion connexion Socket.io
io.on('connection', (socket) => {
  console.log('🔥 Utilisateur connecté :', socket.id);

  // Écouter l'authentification de l'utilisateur
  socket.on('authenticate', (userData) => {
    if (userData && userData.userId) {
      connectedUsers.set(userData.userId, socket.id);
      socket.userId = userData.userId;
      console.log(`✅ Utilisateur ${userData.userId} authentifié sur socket ${socket.id}`);
    }
  });

  // Exemple : envoyer un message de bienvenue
  socket.emit('notification', { 
    type: 'welcome',
    message: 'Bienvenue sur la plateforme artisanale 👋',
    timestamp: new Date().toISOString()
  });

  // Écouter les événements personnalisés
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`🚪 Socket ${socket.id} a rejoint la room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`🚪 Socket ${socket.id} a quitté la room ${roomId}`);
  });

  socket.on('new-order', (orderData) => {
    // Diffuser la nouvelle commande à tous les administrateurs
    socket.broadcast.emit('order-created', {
      ...orderData,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('status-update', (data) => {
    // Notifier un utilisateur spécifique du changement de statut
    const userSocketId = connectedUsers.get(data.userId);
    if (userSocketId) {
      io.to(userSocketId).emit('order-status-changed', {
        orderId: data.orderId,
        newStatus: data.newStatus,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Gestion de la déconnexion
  socket.on('disconnect', (reason) => {
    console.log('❌ Utilisateur déconnecté :', socket.id, 'Raison:', reason);
    
    // Supprimer l'utilisateur de la map des connectés
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
  });

  // Gestion des erreurs de socket
  socket.on('error', (error) => {
    console.error('❌ Erreur Socket.io:', error);
  });
});

// ✅ Gestion des erreurs globales non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  //process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejet de promesse non géré:', reason);
});

// ✅ Gestion des routes non trouvées (DOIT être après toutes les routes)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`,
    timestamp: new Date().toISOString()
  });
});

// ✅ Middleware de gestion d'erreurs global
app.use((error, req, res, next) => {
  console.error('❌ Erreur globale:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ✅ Configuration MongoDB avec meilleure gestion d'erreurs
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// ✅ Connexion MongoDB + démarrage serveur
// Encoder le mot de passe dans l'URI MongoDB
const rawUri = process.env.MONGO_URI || 'mongodb://localhost:27017/artisanat';
const mongoUri = rawUri.replace(/\/\/([^:]+):([^@]+)@/, (match, user, pass) => {
  return `//${user}:${encodeURIComponent(pass)}@`;
});

mongoose.connect(mongoUri, mongooseOptions)
  .then(() => {
    console.log('✅ Connecté à MongoDB avec succès');
    
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
      console.log(`✅ Health check disponible sur http://localhost:${PORT}/api/health`);
      
      // Afficher les routes disponibles
      console.log('\n📋 Routes disponibles:');
      console.log('   - /api/auth/*');
      console.log('   - /api/utilisateurs/*');
      console.log('   - /api/produits/*');
      console.log('   - /api/commandes/*');
      console.log('   - /api/categories/*');
    });
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MongoDB :', err);
    process.exit(1);
  });

// ✅ Exporter io pour l'utiliser dans les contrôleurs
module.exports = { app, io, server };