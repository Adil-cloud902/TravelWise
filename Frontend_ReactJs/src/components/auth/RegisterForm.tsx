import React, { useState, useEffect } from 'react';
import { RegisterFormData } from '../../types/auth';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { validateEmail, validateName, validatePassword, validatePasswordMatch, validatePhone } from '../../utils/validation';
import { UserPlus } from 'lucide-react';

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterFormData, boolean>>>({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      const strength = validatePassword(value);
      setPasswordStrength(strength);
      
      if (formData.confirmPassword) {
        const matchError = validatePasswordMatch(value, formData.confirmPassword) ? '' : 'Passwords do not match';
        setErrors(prev => ({ ...prev, confirmPassword: matchError }));
      }
    }
    
    if (name === 'confirmPassword') {
      const matchError = validatePasswordMatch(formData.password, value) ? '' : 'Passwords do not match';
      setErrors(prev => ({ ...prev, confirmPassword: matchError }));
    }
  };
  
  const validateField = (name: keyof RegisterFormData, value: string): string => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        return validateName(value) ? '' : 'Name must be at least 2 characters';
      case 'email':
        return validateEmail(value) ? '' : 'Please enter a valid email address';
      case 'phone':
        return validatePhone(value) ? '' : 'Please enter a valid phone number';
      case 'password':
        const strength = validatePassword(value);
        return strength.isValid ? '' : 'Password does not meet requirements';
      case 'confirmPassword':
        return validatePasswordMatch(formData.password, value) ? '' : 'Passwords do not match';
      default:
        return '';
    }
  };
  
  const handleBlur = (name: keyof RegisterFormData) => {
    const value = formData[name];
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Partial<Record<keyof RegisterFormData, boolean>>
    );
    setTouched(allTouched);
    
    const newErrors: Partial<RegisterFormData> = {};
    let isValid = true;
    
    (Object.keys(formData) as Array<keyof RegisterFormData>).forEach((key) => {
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
      <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Create Your Account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            id="firstName"
            name="firstName"
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={() => handleBlur('firstName')}
            error={touched.firstName ? errors.firstName : undefined}
            placeholder="John"
            required
            autoComplete="given-name"
          />
          
          <FormInput
            id="lastName"
            name="lastName"
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={() => handleBlur('lastName')}
            error={touched.lastName ? errors.lastName : undefined}
            placeholder="Doe"
            required
            autoComplete="family-name"
          />
        </div>
        
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
          id="phone"
          name="phone"
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          onBlur={() => handleBlur('phone')}
          error={touched.phone ? errors.phone : undefined}
          placeholder="+1234567890"
          required
          autoComplete="tel"
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
          autoComplete="new-password"
        />
        
        {(touched.password || formData.password) && (
          <PasswordStrengthMeter passwordStrength={passwordStrength} />
        )}
        
        <FormInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={() => handleBlur('confirmPassword')}
          error={touched.confirmPassword ? errors.confirmPassword : undefined}
          required
          autoComplete="new-password"
        />
        
        <div className="mt-6">
          <Button 
            type="submit" 
            fullWidth 
            icon={<UserPlus size={20} />}
            className="hover:transform hover:scale-105 transition-transform duration-200"
          >
            Register
          </Button>
        </div>
        
        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Sign In
          </button>
        </p>
      </form>
    </div>
  );
};

export default RegisterForm;