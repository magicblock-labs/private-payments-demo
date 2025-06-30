import './VerificationToast.css';

import React, { useState } from 'react';

import { useTdxQuoteVerification } from './hooks/use-tdx-quote-verification';
import { Check, Cross } from 'lucide-react';

const VerificationToast: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isVerified, isLoading, resetVerification } = useTdxQuoteVerification();

  const ToastContent = () => {
    if (isLoading) {
      return <div className='toast-content-pending'>Verification pending...</div>;
    } else if (isVerified) {
      return <div className='toast-content-success'>Verification successful</div>;
    } else {
      return <div className='toast-content-error'>Verification failed</div>;
    }
  };

  const StatusIcon = () => {
    if (isLoading) {
      return <div className='status-icon-pending'>?</div>;
    } else if (isVerified) {
      return (
        <div className='status-icon-success'>
          <Check />
        </div>
      );
    } else {
      return (
        <div className='status-icon-error'>
          <Cross />
        </div>
      );
    }
  };

  return isOpen ? (
    <div className='toast'>
      <ToastContent />
      <span style={{ fontSize: '12px', color: '#7F7F7F' }}>
        Make sure the server is running using genuine secure hardware
      </span>
      <div className='toast-buttons'>
        <button onClick={resetVerification}>Reset</button>
        <button onClick={() => setIsOpen(false)}>Close</button>
      </div>
    </div>
  ) : (
    <div onClick={() => setIsOpen(true)}>
      <StatusIcon />
    </div>
  );
};

export default VerificationToast;
