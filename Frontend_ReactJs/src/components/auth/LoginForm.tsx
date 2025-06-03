import React, { useState } from 'react';
import { LoginFormData } from '../../types/auth';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import { validateEmail } from '../../utils/validation';
import { LogIn } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSwitchToRegister,
  onForgotPassword,
}) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof LoginFormData, boolean>>>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const validateField = (name: keyof LoginFormData, value: string) => {
    switch (name) {
      case 'email':
        return validateEmail(value) ? '' : 'Please enter a valid email address';
      case 'password':
        return value.length > 0 ? '' : 'Password is required';
      default:
        return '';
    }
  };
  
  const handleBlur = (name: keyof LoginFormData) => {
    const value = formData[name];
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Partial<Record<keyof LoginFormData, boolean>>
    );
    setTouched(allTouched);
    
    const newErrors: Partial<LoginFormData> = {};
    let isValid = true;
    
    (Object.keys(formData) as Array<keyof LoginFormData>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    
    if (isValid) {
      onSubmit(formData);
    }
  };
  
  return (
    <div className="glass-effect p-8 rounded-2xl shadow-lg max-w-md w-full mx-auto form-transition">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Welcome Back</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          id="email"
          name="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => handleBlur('email')}
          error={touched.email ? errors.email : undefined}
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
        
        <FormInput
          id="password"
          name="password"
          label="Password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={() => handleBlur('password')}
          error={touched.password ? errors.password : undefined}
          required
          autoComplete="current-password"
        />
        
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Forgot password?
          </button>
        </div>
        
        <Button 
          type="submit" 
          fullWidth 
          icon={<LogIn size={20} />}
          className="hover:transform hover:scale-105 transition-transform duration-200"
        >
          Sign In
        </Button>
        
        <p className="text-center text-gray-600 mt-6">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Register
          </button>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;