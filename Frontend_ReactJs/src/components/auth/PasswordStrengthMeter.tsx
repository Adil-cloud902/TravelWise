import React from 'react';
import { PasswordStrength } from '../../types/auth';

interface PasswordStrengthMeterProps {
  passwordStrength: PasswordStrength;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ passwordStrength }) => {
  const { score, hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar } = passwordStrength;

  const getStrengthLabel = () => {
    if (score === 0) return { text: '', color: 'bg-gray-200' };
    if (score === 1) return { text: 'Very Weak', color: 'bg-red-500' };
    if (score === 2) return { text: 'Weak', color: 'bg-orange-500' };
    if (score === 3) return { text: 'Moderate', color: 'bg-yellow-500' };
    if (score === 4) return { text: 'Strong', color: 'bg-blue-500' };
    return { text: 'Very Strong', color: 'bg-green-500' };
  };

  const strengthLabel = getStrengthLabel();

  return (
    <div className="mt-2 mb-4">
      <div className="flex mb-1">
        <div className={`h-1 flex-1 rounded-l-full ${score >= 1 ? strengthLabel.color : 'bg-gray-200'}`}></div>
        <div className={`h-1 flex-1 ${score >= 2 ? strengthLabel.color : 'bg-gray-200'}`}></div>
        <div className={`h-1 flex-1 ${score >= 3 ? strengthLabel.color : 'bg-gray-200'}`}></div>
        <div className={`h-1 flex-1 ${score >= 4 ? strengthLabel.color : 'bg-gray-200'}`}></div>
        <div className={`h-1 flex-1 rounded-r-full ${score >= 5 ? strengthLabel.color : 'bg-gray-200'}`}></div>
      </div>
      
      {score > 0 && (
        <p className={`text-xs ${score <= 2 ? 'text-red-500' : score <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
          {strengthLabel.text}
        </p>
      )}
      
      <ul className="mt-2 text-xs space-y-1">
        <li className={`flex items-center ${hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
          <span className={`mr-1 inline-block w-3 h-3 rounded-full ${hasMinLength ? 'bg-green-600' : 'bg-gray-300'}`}></span>
          At least 8 characters
        </li>
        <li className={`flex items-center ${hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
          <span className={`mr-1 inline-block w-3 h-3 rounded-full ${hasUpperCase ? 'bg-green-600' : 'bg-gray-300'}`}></span>
          Uppercase letter
        </li>
        <li className={`flex items-center ${hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
          <span className={`mr-1 inline-block w-3 h-3 rounded-full ${hasLowerCase ? 'bg-green-600' : 'bg-gray-300'}`}></span>
          Lowercase letter
        </li>
        <li className={`flex items-center ${hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
          <span className={`mr-1 inline-block w-3 h-3 rounded-full ${hasNumber ? 'bg-green-600' : 'bg-gray-300'}`}></span>
          Number
        </li>
        <li className={`flex items-center ${hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
          <span className={`mr-1 inline-block w-3 h-3 rounded-full ${hasSpecialChar ? 'bg-green-600' : 'bg-gray-300'}`}></span>
          Special character
        </li>
      </ul>
    </div>
  );
};

export default PasswordStrengthMeter;