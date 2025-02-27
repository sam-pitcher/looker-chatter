import styled, { createGlobalStyle } from 'styled-components';

// Global styles for animations & font
export const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Roboto', sans-serif;
  }

  @keyframes typingDots {
    0%, 80%, 100% {
      transform: scale(0.3);
    }
    40% {
      transform: scale(1.0);
    }
  }
`;


// Styled components
export const TypingDotsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const TypingDot = styled.div`
  width: 6px;
  height: 6px;
  background-color: #888; // Slightly lighter color for a more subtle effect
  border-radius: 50%;
  animation: typingDots 1.4s infinite ease-in-out;

  &:nth-child(1) {
    animation-delay: 0s;
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
`;

export const MessageContainer = styled.div`
    display: flex;
    align-self: flex-start;
    background-color: #f1f3f4; // Subtle light gray background
    padding: 8px 12px;
    border-radius: 20px; // Rounded corners for a softer feel
    font-size: 14px;
    margin-bottom: 8px; // More space between messages
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); // Slight shadow for depth
    max-width: 75%; // Ensure messages aren't too wide
    word-wrap: break-word;
`;

export const Avatar = styled.img`
    width: 45px;
    height: 45px;
    border-radius: 50%;
    order: ${props => props.isUser ? 2 : 0};
`;

export const MessageWrapper = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: ${props => props.isUser ? 'flex-end' : 'flex-start'};
    margin: 8px 0;
    gap: 8px;
`;

export const styles = {
    globalFont: {
        fontFamily: 'Roboto',
    },
    chatBotContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '80%',
        width: '90%',
        border: '1px solid #ccc',
        borderRadius: '16px', // Increased border radius for a more rounded look
        overflow: 'hidden',
        fontFamily: 'Roboto, Arial, sans-serif', // Using Roboto, typical for Google Chat
        position: 'absolute',
        left: '5%',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', // Softer shadow with more depth
    },
    selectionContainer: {
        padding: '16px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        backgroundColor: '#f9f9f9', // Slightly off-white background
    },
    dropdown: {
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px', // Softened corners
        backgroundColor: '#fff',
        fontSize: '14px',
        flex: 1,
        maxWidth: '280px',
        color: '#333',
        transition: 'border-color 0.2s ease',
    },
    chatMessages: {
        height: '70vh',
        width: '100%',
        flex: 1,
        padding: '12px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    message: {
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        backgroundColor: '#4285f4',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px',
    },
    chartContainer: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    chartControls: {
        display: 'flex',
        gap: '20px',
        padding: '12px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '12px',
        flexWrap: 'wrap',
    },
    controlGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '200px',
    },
    controlLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#444',
        whiteSpace: 'nowrap',
    },
    select: {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        fontSize: '14px',
        color: '#333',
        cursor: 'pointer',
        minWidth: '100px',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M3 5h6L6 9z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: '12px',
        transition: 'all 0.2s ease',
        flex: 1,
    },
    inputSection: {
        display: 'flex',
        padding: '16px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fff',
        gap: '12px',
    },
    input: {
        flex: 1,
        padding: '10px 14px',
        fontSize: '14px',
        fontFamily: 'Roboto',
        borderRadius: '8px',
        border: '1px solid #ddd',
        minHeight: '30px',
        maxHeight: '80px',
        resize: 'none',
        overflow: 'auto',
        transition: 'border-color 0.2s ease',
    },
    button: {
        padding: '10px 18px',
        fontSize: '14px',
        borderRadius: '8px',
        backgroundColor: '#1a73e8', // Google Blue
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        ':hover': {
            backgroundColor: '#1867c0', // Hover effect
        },
    },
    primaryButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: '#0d6efd',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    secondaryButton: {
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: '#fff',
        color: '#0d6efd',
        border: '1px solid #0d6efd',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    preformatted: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        fontSize: '14px',
        fontFamily: 'Roboto',
    },
    tableContainer: {
        width: '100%',
        overflowX: 'auto',
        marginTop: '12px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
    },
    tableHeader: {
        padding: '10px 14px',
        backgroundColor: '#f1f3f4',
        borderBottom: '2px solid #dee2e6',
        textAlign: 'left',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    tableCell: {
        padding: '8px 14px',
        borderBottom: '1px solid #dee2e6',
        whiteSpace: 'nowrap',
    },
    loadingSpinner: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        color: '#888',
        marginTop: '12px',
    },
    typingDotsContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    typingDot: {
        width: '6px',
        height: '6px',
        backgroundColor: '#888', // Lightened for a cleaner look
        borderRadius: '50%',
        animation: 'typingDots 1.4s infinite ease-in-out',
    },
    typingDot1: {
        animationDelay: '0s',
    },
    typingDot2: {
        animationDelay: '0.2s',
    },
    typingDot3: {
        animationDelay: '0.4s',
    },
    jsonPreview: {
        fontSize: '12px',
        color: '#666',
        marginBottom: '8px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    editJsonButton: {
        padding: '6px 12px',
        fontSize: '12px',
        backgroundColor: '#4a90e2',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    modal: {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            maxWidth: '800px',
            maxHeight: '80vh',
            padding: '0',
            border: '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden',
        },
        overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
    },
    modalHeader: {
        padding: '16px 20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
    },
    modalBody: {
        padding: '20px',
        maxHeight: 'calc(80vh - 150px)',
        overflowY: 'auto',
    },
    modalFooter: {
        padding: '16px 20px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    jsonGuide: {
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
    },
    jsonGuideTitle: {
        margin: '0 0 10px 0',
        fontSize: '14px',
        fontWeight: '600',
    },
    jsonGuideCode: {
        margin: 0,
        padding: '10px',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
    },
    modalJsonInput: {
        width: '100%',
        minHeight: '300px',
        padding: '12px',
        fontSize: '14px',
        fontFamily: 'monospace',
        border: '1px solid #ccc',
        borderRadius: '4px',
        resize: 'vertical',
    },
    modalPrimaryButton: {
        padding: '8px 16px',
        backgroundColor: '#0d6efd',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    modalSecondaryButton: {
        padding: '8px 16px',
        backgroundColor: '#fff',
        color: '#6c757d',
        border: '1px solid #6c757d',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    resultBox: {
        flex: 1,
        overflow: 'hidden', // Changed from auto to hidden
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 20px 0 20px', // Removed bottom padding
    },
    resultsContainer: {
        padding: '20px',
        overflowY: 'auto',
        flex: 1,
        backgroundColor: '#fff',
    },
    heading: {
        margin: '0 0 15px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#212529',
    },
    tableWrapper: {
        flex: 1,
        overflowY: 'auto',
        overflowX: 'auto',
        marginBottom: '20px', // Add space before buttons
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
    },

    '@keyframes typingDots': {
        '0%, 80%, 100%': { transform: 'scale(0.3)' },
        '40%': { transform: 'scale(1.0)' },
    },
};
