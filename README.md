# Mugesh Media - Service Subscription Portal

A comprehensive full-stack web application for managing service subscriptions including Cable TV, Internet, Silver Care, Snack Delivery, Gaming Setup, Design Services, and Development services.

## 🚀 Features

### Core Features
- **Service Catalog** - Browse and filter services by category, price, and availability
- **Plan Builder** - Create custom subscription plans with multiple services
- **Subscription Management** - View, update, pause, and cancel subscriptions
- **User Dashboard** - Comprehensive user dashboard with subscription overview
- **Admin Panel** - Complete admin interface for managing services, users, and subscriptions

### Technical Features
- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Real-time Updates** - Live subscription status and notifications
- **Payment Integration** - Ready for payment gateway integration
- **Analytics Dashboard** - Detailed analytics for admins
- **Search & Filtering** - Advanced search and filtering capabilities

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Server state management
- **React Hook Form** - Form handling and validation
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Toast notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Express Validator** - Input validation
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
NextApps/
├── backend/                 # Node.js/Express backend
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── scripts/            # Database seeding scripts
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── App.jsx         # Main app component
│   └── public/             # Static assets
├── database/               # Database related files
└── docs/                   # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NextApps
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment file
   cp .env.example .env
   
   # Update .env with your configuration
   # - MongoDB connection string
   # - JWT secret
   # - Other environment variables
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   cd ../backend
   
   # Seed the database with sample data
   node scripts/seedDatabase.js
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on `http://localhost:3003`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:3000`

## 🔐 Demo Credentials

### Admin Account
- **Email:** admin@mugesh.media
- **Password:** admin123

### Customer Account
- **Email:** john@example.com
- **Password:** password123

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Services
- `GET /api/services` - Get all services (with filtering)
- `GET /api/services/:id` - Get service by ID
- `GET /api/services/categories` - Get service categories
- `GET /api/services/featured` - Get featured services

### Subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions` - Get user subscriptions
- `PUT /api/subscriptions/:id` - Update subscription
- `PUT /api/subscriptions/:id/cancel` - Cancel subscription
- `PUT /api/subscriptions/:id/pause` - Pause subscription

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Manage users
- `POST /api/admin/services` - Create service
- `PUT /api/admin/services/:id` - Update service
- `GET /api/admin/analytics` - Analytics data

## 🎨 UI/UX Features

- **Google Material Design** - Clean, minimal interface
- **Dark/Light Theme** - Theme switching capability
- **Mobile Responsive** - Works on all device sizes
- **Accessibility** - WCAG compliant design
- **Loading States** - Smooth loading indicators
- **Error Handling** - User-friendly error messages

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/mugesh_media
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or your preferred MongoDB hosting
2. Configure environment variables for production
3. Deploy to platforms like Heroku, Railway, or DigitalOcean

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to platforms like Vercel, Netlify, or AWS S3

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📈 Performance Optimizations

- **Code Splitting** - Lazy loading of routes
- **Image Optimization** - Optimized images and lazy loading
- **Caching** - API response caching with React Query
- **Bundle Optimization** - Tree shaking and minification
- **Database Indexing** - Optimized MongoDB queries

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt password hashing
- **Input Validation** - Server-side input validation
- **CORS Protection** - Cross-origin request protection
- **Rate Limiting** - API rate limiting
- **Helmet Security** - Security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Mugesh Media** - Full-stack development and design

## 📞 Support

For support, email info@mugesh.media or create an issue in the repository.

## 🎯 Roadmap

- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Real-time notifications with WebSocket
- [ ] Mobile app development (React Native)
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] API rate limiting and throttling
- [ ] Advanced search with Elasticsearch
- [ ] Automated testing suite
- [ ] CI/CD pipeline setup
- [ ] Docker containerization

---

**Built with ❤️ by Mugesh Media**
