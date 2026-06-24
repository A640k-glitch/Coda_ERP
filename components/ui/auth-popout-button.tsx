import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPopoutButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [bounds, setBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      // calculate target bounds (centered, max width 1100, max height 800)
      setTimeout(() => setShowIframe(true), 500);
    } else {
      document.body.style.overflow = 'unset';
      setShowIframe(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  const handleExpand = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setBounds({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setIsExpanded(true);
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleExpand}
        className="btn btn-primary btn-lg btn-interactive"
        style={{ border: 'none', cursor: 'pointer', opacity: isExpanded ? 0 : 1 }}
      >
        Start your free trial
      </button>

      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9998,
                background: 'rgba(15,23,42,0.6)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={handleClose}
            />

            <motion.div
              initial={{
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
                borderRadius: '9999px',
                background: '#0d9488', // var(--teal-600)
              }}
              animate={{
                top: Math.max(24, (window.innerHeight - Math.min(window.innerHeight - 48, 800)) / 2),
                left: Math.max(24, (window.innerWidth - Math.min(window.innerWidth - 48, 1100)) / 2),
                width: Math.min(window.innerWidth - 48, 1100),
                height: Math.min(window.innerHeight - 48, 800),
                borderRadius: '24px',
                background: '#0f172a', // slate-900 for auth page
              }}
              exit={{
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
                borderRadius: '9999px',
                background: '#0d9488',
                opacity: 0
              }}
              transition={{
                type: 'spring',
                stiffness: 250,
                damping: 30,
                mass: 0.8
              }}
              style={{
                position: 'fixed',
                zIndex: 9999,
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: 0.3 }}
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  zIndex: 50,
                  background: '#0d9488',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#14b8a6';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#0d9488';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px', fontWeight: 'bold' }}>close</span>
              </motion.button>

              <AnimatePresence>
                {!showIframe && (
                  <motion.div
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <div style={{
                      width: '30px',
                      height: '30px',
                      border: '3px solid rgba(255,255,255,0.2)',
                      borderTopColor: '#0d9488',
                      borderRadius: '50%',
                      animation: 'authSpinner 1s linear infinite'
                    }} />
                  </motion.div>
                )}
              </AnimatePresence>

              {showIframe && (
                <motion.iframe
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  src="/signup.html"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: 'transparent'
                  }}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes authSpinner {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
