// styles.js
export const styles = {
    chatBotContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '80%',
        width: '90%',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        position: 'absolute',
        left: '5%',
        backgroundColor: '#fff',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    selectionContainer: {
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    dropdown: {
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '6px',
        backgroundColor: '#fff',
        fontSize: '14px',
        flex: 1,
        maxWidth: '300px',
        color: '#495057',
    },
    chatMessages: {
        height: '70vh',
        width: '100%',
        flex: 1,
        padding: '10px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fafafa',
    },
    chartContainer: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    chartControls: {
        display: 'flex',
        gap: '15px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '10px',
        flexWrap: 'wrap',
    },
    controlGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '180px',
    },
    controlLabel: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#444',
        whiteSpace: 'nowrap',
    },
    select: {
        padding: '6px 10px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        backgroundColor: '#fff',
        fontSize: '13px',
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
    messageChart: {
        height: '300px',
        width: '100%',
        padding: '8px',
    },
    message: {
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    },
    inputSection: {
        display: 'flex',
        padding: '12px',
        borderTop: '1px solid #eee',
        backgroundColor: '#fff',
        gap: '8px',
    },
    input: {
        flex: 1,
        padding: '8px 12px',
        fontSize: '13px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        minHeight: '24px',
        maxHeight: '80px',
        resize: 'none',
        overflow: 'auto',
        transition: 'border-color 0.2s ease',
    },
    button: {
        padding: '8px 16px',
        fontSize: '13px',
        borderRadius: '4px',
        backgroundColor: '#007BFF',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
    },
    preformatted: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        fontSize: '13px',
        fontFamily: 'monospace',
    },
    tableContainer: {
        width: '100%',
        overflowX: 'auto',
        marginTop: '8px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
    },
    tableHeader: {
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderBottom: '2px solid #dee2e6',
        textAlign: 'left',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    tableCell: {
        padding: '6px 12px',
        borderBottom: '1px solid #dee2e6',
        whiteSpace: 'nowrap',
    },
    loadingSpinner: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#666',
        marginTop: '8px'
    },
};