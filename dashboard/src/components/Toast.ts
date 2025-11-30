// Simple toast notification system
let toastContainer: HTMLDivElement | null = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function show(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = getToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `
    px-4 py-3 rounded-lg shadow-lg text-white font-medium
    transform transition-all duration-300 translate-x-0
    ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'}
  `;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}
