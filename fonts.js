export const FONT_FAMILY = 'JetBrains Mono';
export const FONT_COLOR = '#ffffff';

export const fontStyle = (baseSize, customStyle = {}) => {
    const H = window.innerHeight; // Get screen height
    const W = window.innerWidth;  // Get screen width

    // Calculate the font size based on screen height or width
    const fontSize = Math.min(baseSize, H * 0.03, W * 0.03);  // Adjust multiplier for scaling
    
    // Return the font style with dynamic font size
    return {
        fontFamily: 'JetBrains Mono',
        fontSize: `${fontSize}px`,  // Use the dynamically calculated font size
        ...customStyle
    };
};
