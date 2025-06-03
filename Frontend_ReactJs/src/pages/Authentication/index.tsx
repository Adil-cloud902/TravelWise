import React, { useState } from 'react';
import { AuthStep, LoginFormData, RegisterFormData } from '../../types/auth';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import { Compass, Map, Mountain, Palmtree } from 'lucide-react';
import { login, register } from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom'; // 🔁 Redirection

const Authentication: React.FC = () => {
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const navigate = useNavigate(); // 🔁

  const handleLogin = async (data: LoginFormData) => {
    try {
      const response = await login(data.email, data.password);
      toast.success('Connexion réussie !');
      console.log('Login successful:', response);

      // 🔁 Redirection vers la page de planification
      navigate('/planner');
    } catch (error) {
      toast.error('Échec de la connexion. Vérifiez vos identifiants.');
      console.error('Login error:', error);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...userData } = data;
      const response = await register(userData);
      toast.success('Inscription réussie ! Connectez-vous.');
      setAuthStep('login');
      console.log('Registration successful:', response);
    } catch (error) {
      toast.error('Échec de l\'inscription. Réessayez.');
      console.error('Registration error:', error);
    }
  };

  const handleForgotPassword = () => {
    toast('Fonction de réinitialisation du mot de passe bientôt disponible !');
  };

  const renderAuthContent = () => {
    switch (authStep) {
      case 'login':
        return (
          <div className="animate-fade-in">
            <LoginForm
              onSubmit={handleLogin}
              onSwitchToRegister={() => setAuthStep('register')}
              onForgotPassword={handleForgotPassword}
            />
          </div>
        );
      case 'register':
        return (
          <div className="animate-fade-in">
            <RegisterForm
              onSubmit={handleRegister}
              onSwitchToLogin={() => setAuthStep('login')}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-travel-pattern bg-fixed">
      <Toaster position="top-right" />
      {/* Branding side */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600/90 to-teal-500/90 p-12 flex-col justify-between backdrop-blur-sm">
        <div className="flex items-center animate-slide-in">
          <Compass size={32} className="text-white mr-2" />
          <h1 className="text-2xl font-bold text-white">TravelWise</h1>
        </div>
        <div className="space-y-8">
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-5xl font-bold text-white leading-tight">
              Discover your perfect journey
            </h2>
            <p className="text-white text-xl opacity-90">
              Join thousands of travelers getting personalized recommendations for their next adventure.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="bg-white/20 backdrop-blur-sm p-6 rounded-xl hover-scale">
              <Map size={28} className="text-white mb-3 animate-float" />
              <p className="text-white font-medium">Custom Itineraries</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-6 rounded-xl hover-scale">
              <Mountain size={28} className="text-white mb-3 animate-float" style={{ animationDelay: '0.2s' }} />
              <p className="text-white font-medium">Adventure Tours</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-6 rounded-xl hover-scale">
              <Palmtree size={28} className="text-white mb-3 animate-float" style={{ animationDelay: '0.4s' }} />
              <p className="text-white font-medium">Beach Getaways</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex -space-x-4">
              <img
                src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=64"
                className="w-10 h-10 rounded-full border-2 border-white"
                alt="User"
              />
              <img
                src="https://images.pexels.com/photos/2269872/pexels-photo-2269872.jpeg?auto=compress&cs=tinysrgb&w=64"
                className="w-10 h-10 rounded-full border-2 border-white"
                alt="User"
              />
              <img
                src="https://images.pexels.com/photos/2406949/pexels-photo-2406949.jpeg?auto=compress&cs=tinysrgb&w=64"
                className="w-10 h-10 rounded-full border-2 border-white"
                alt="User"
              />
            </div>
            <p className="text-white text-sm">
              Join 10,000+ travelers worldwide
            </p>
          </div>
        </div>
        <div className="text-white/70 text-sm animate-fade-in" style={{ animationDelay: '0.8s' }}>
          © 2025 TravelWise. All rights reserved.
        </div>
      </div>

      {/* Auth section */}
      <div className="flex-1 flex items-center justify-center p-6 backdrop-blur-md bg-white/30">
        <div className="md:hidden absolute top-8 left-6 flex items-center animate-fade-in">
          <Compass size={24} className="text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-800">TravelWise</h1>
        </div>
        <div className="w-full max-w-md">
          {renderAuthContent()}
        </div>
      </div>
    </div>
  );
};

export default Authentication;
