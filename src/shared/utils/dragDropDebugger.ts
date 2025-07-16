/**
 * Utilidad para depurar eventos de arrastrar y soltar en ReactFlow
 */

// Función de depuración global
export const setupDragDropDebugging = () => {
  console.log('🔧 Setting up drag & drop debugging utilities...');
  
  // Monitorear eventos de arrastrar y soltar a nivel del documento
  document.addEventListener('dragstart', (e) => {
    console.log('🔍 DOCUMENT DRAGSTART:', e);
    try {
      console.log('Types available:', e.dataTransfer?.types);
      if (e.dataTransfer?.types.includes('application/reactflow')) {
        console.log('Value:', e.dataTransfer.getData('application/reactflow'));
      }
    } catch (error) {
      // No se pueden leer los datos durante dragstart excepto en el handler original
      console.log('Cannot access data in listener (security restriction)');
    }
  });
  
  document.addEventListener('dragover', (e) => {
    // Log solo cada 10 eventos para evitar spam
    if (Math.random() < 0.1) {
      console.log('🔄 DOCUMENT DRAGOVER');
    }
  }, true);
  
  document.addEventListener('dragenter', (e) => {
    console.log('➡️ DOCUMENT DRAGENTER:', e.target);
  }, true);
  
  document.addEventListener('dragleave', (e) => {
    console.log('⬅️ DOCUMENT DRAGLEAVE:', e.target);
  }, true);
  
  document.addEventListener('drop', (e) => {
    console.log('🔍 DOCUMENT DROP:', e);
    try {
      console.log('Types available:', e.dataTransfer?.types);
      if (e.dataTransfer?.types.includes('application/reactflow')) {
        console.log('Value:', e.dataTransfer.getData('application/reactflow'));
      }
      if (e.dataTransfer?.types.includes('text/plain')) {
        console.log('Text value:', e.dataTransfer.getData('text/plain'));
      }
    } catch (error) {
      console.error('Error accessing data:', error);
    }
  }, true);
  
  // Añadir un indicador visual para el área de soltar
  const addDropIndicator = () => {
    const existingIndicator = document.getElementById('drop-indicator');
    if (!existingIndicator) {
      const indicator = document.createElement('div');
      indicator.id = 'drop-indicator';
      indicator.style.position = 'fixed';
      indicator.style.bottom = '20px';
      indicator.style.right = '20px';
      indicator.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
      indicator.style.color = 'white';
      indicator.style.padding = '10px 15px';
      indicator.style.borderRadius = '5px';
      indicator.style.zIndex = '9999';
      indicator.style.fontWeight = 'bold';
      indicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      indicator.style.transition = 'all 0.3s ease';
      indicator.style.opacity = '0';
      indicator.textContent = 'Drag & Drop Mode';
      document.body.appendChild(indicator);
      
      // Mostrar cuando inicia el arrastre
      document.addEventListener('dragstart', () => {
        indicator.style.opacity = '1';
      });
      
      // Ocultar cuando termina
      document.addEventListener('dragend', () => {
        indicator.style.opacity = '0';
      });
      document.addEventListener('drop', () => {
        indicator.style.opacity = '0';
      });
    }
  };
  
  // Activar el indicador visual
  addDropIndicator();
  
  console.log('✅ Drag & drop debugging utilities set up successfully');
};
