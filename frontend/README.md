# Fleet Management System - Frontend

A modern React-based frontend for the Fleet Management System, built with Tailwind CSS and designed to work seamlessly with the Node.js backend.

## 🚀 Features

### Authentication & Authorization
- **JWT-based authentication** with secure token storage
- **Role-based access control** (Admin, Manager, Driver)
- **Protected routes** that adapt based on user permissions
- **Automatic token refresh** and session management

### Role-Based Dashboards

#### Driver Dashboard
- Submit maintenance, fuel, and per diem requests
- Log daily trips with start/end locations and odometer readings
- View personal request statuses and approvals
- Track trip history and distances

#### Manager Dashboard
- Approve/reject driver requests (maintenance, fuel, per diem)
- View comprehensive driver logs and trip data
- Access detailed reports and analytics
- Manage vehicle assignments and status

#### Admin Dashboard
- All manager capabilities plus:
- **User Management**: Create, edit, and delete users
- **Vehicle Management**: Full CRUD operations for fleet vehicles
- **System Administration**: Complete oversight of all operations

### Core Functionality
- **Maintenance Requests**: Track vehicle maintenance needs and costs
- **Fuel Management**: Monitor fuel consumption and costs per vehicle
- **Per Diem Tracking**: Manage trip expenses and reimbursements
- **Driver Logs**: Comprehensive trip logging with distance calculations
- **Reports & Analytics**: Visual charts and data insights

## 🛠️ Technology Stack

- **React 18** - Modern React with hooks and functional components
- **Tailwind CSS 3** - Utility-first CSS framework for rapid UI development
- **React Router 6** - Client-side routing and navigation
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Elegant toast notifications
- **Lucide React** - Beautiful, customizable icons
- **Recharts** - Composable charting library for data visualization
- **Date-fns** - Modern JavaScript date utility library

## 📁 Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Layout.js          # Main layout with sidebar navigation
│   │   └── ProtectedRoute.js  # Role-based route protection
│   ├── contexts/
│   │   └── AuthContext.js     # Authentication state management
│   ├── pages/
│   │   ├── Login.js           # User authentication
│   │   ├── Register.js        # User registration (admin only)
│   │   ├── Dashboard.js       # Role-based dashboard
│   │   ├── Users.js           # User management (admin only)
│   │   ├── Vehicles.js        # Vehicle management
│   │   ├── Maintenance.js     # Maintenance requests
│   │   ├── Fuel.js            # Fuel requests
│   │   ├── PerDiem.js         # Per diem requests
│   │   ├── Logs.js            # Driver trip logs
│   │   └── Reports.js         # Analytics and reporting
│   ├── services/
│   │   └── api.js             # API service layer
│   ├── App.js                 # Main application component
│   ├── index.js               # Application entry point
│   └── index.css              # Global styles and Tailwind imports
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Backend server running (see backend README)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend URL**
   Update the `baseURL` in `src/services/api.js` to match your backend server:
   ```javascript
   baseURL: 'http://localhost:3000', // Change to your backend URL
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the frontend root directory:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENV=development
```

### Tailwind CSS Configuration
The project uses a custom Tailwind configuration with:
- Custom color palette
- Responsive design utilities
- Custom component classes

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

Features include:
- Collapsible sidebar navigation
- Mobile-optimized forms and tables
- Touch-friendly interface elements

## 🔐 Security Features

- **JWT Token Storage**: Secure localStorage implementation
- **Route Protection**: Automatic redirect for unauthorized access
- **API Interceptors**: Automatic token injection and error handling
- **Role Validation**: Server-side and client-side permission checks

## 📊 Data Visualization

The Reports page includes:
- **Bar Charts**: Maintenance costs, fuel consumption, per diem costs
- **Status Distribution**: Request approval rates
- **Summary Statistics**: Total costs, distances, and trends
- **Interactive Filters**: Date range selection for data analysis

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 🚀 Deployment

### Build and Deploy
1. Build the application: `npm run build`
2. Deploy the `build/` folder to your web server
3. Configure your server to serve the React app

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔄 API Integration

The frontend integrates with the backend through:
- **RESTful API endpoints** for all CRUD operations
- **Real-time data updates** with optimistic UI updates
- **Error handling** with user-friendly notifications
- **Loading states** for better user experience

### API Endpoints Used
- `/auth/*` - Authentication and user management
- `/users/*` - User CRUD operations
- `/vehicles/*` - Vehicle management
- `/maintenance/*` - Maintenance requests
- `/fuel/*` - Fuel requests
- `/perdiem/*` - Per diem requests
- `/logs/*` - Driver trip logs

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Consistent Styling**: Unified design system with Tailwind CSS
- **Interactive Elements**: Hover effects, transitions, and animations
- **Accessibility**: ARIA labels, keyboard navigation support
- **Loading States**: Skeleton loaders and progress indicators

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the backend README for API documentation
- Review the code comments for implementation details
- Open an issue for bugs or feature requests

## 🔮 Future Enhancements

- Real-time notifications using WebSockets
- Advanced filtering and search capabilities
- Export functionality for reports
- Mobile app using React Native
- Integration with external mapping services
- Advanced analytics and machine learning insights
