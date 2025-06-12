import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const WarningIcon = styled.div`
  color: #ff4444;
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  color: #ff4444;
  margin: 0 0 16px;
  text-align: center;
  font-size: 20px;
`;

const Message = styled.p`
  color: #333;
  margin: 0 0 24px;
  text-align: center;
  line-height: 1.5;
`;

const Button = styled.button`
  background-color: #ff4444;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
  transition: background-color 0.2s;

  &:hover {
    background-color: #ff2222;
  }
`;

const AudioWarningModal = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalContent>
        <WarningIcon>⚠️</WarningIcon>
        <Title>Audio Warning</Title>
        <Message>{message}</Message>
        <Button onClick={onClose}>I Understand</Button>
      </ModalContent>
    </ModalOverlay>
  );
};

AudioWarningModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AudioWarningModal; 