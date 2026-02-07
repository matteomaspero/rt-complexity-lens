import html2canvas from 'html2canvas';

export async function exportChartAsPng(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Get computed background color from the element or its parent
  const computedStyle = window.getComputedStyle(element);
  let backgroundColor = computedStyle.backgroundColor;
  
  // If transparent, try to get from card background
  if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') {
    backgroundColor = '#ffffff'; // Fallback to white
    // Try to detect dark mode
    if (document.documentElement.classList.contains('dark')) {
      backgroundColor = '#1a1a1a';
    }
  }

  const canvas = await html2canvas(element, {
    backgroundColor,
    scale: 2, // Higher resolution for better quality
    logging: false,
    useCORS: true,
  });

  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  link.download = `${filename}_${timestamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
