document.addEventListener('DOMContentLoaded', () => {
    const notifyBtn = document.getElementById('notify-btn');
    
    notifyBtn.addEventListener('click', () => {
        // Simple success interaction feeling
        notifyBtn.innerText = 'Заявка принята!';
        notifyBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        notifyBtn.style.boxShadow = '0 10px 20px -10px rgba(16, 185, 129, 0.5)';
        
        // Return back to normal after some time to simulate processing
        setTimeout(() => {
            notifyBtn.innerText = 'Узнать первым';
            notifyBtn.style.background = '';
            notifyBtn.style.boxShadow = '';
        }, 3000);
    });

    // 3D Parallax effect on mouse move
    const glassContainer = document.querySelector('.glass-container');
    
    document.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
        
        glassContainer.style.transform = `translateY(0) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    });
    
    // Reset transform on mouse leave
    document.addEventListener('mouseleave', () => {
        glassContainer.style.transform = `translateY(0) rotateY(0deg) rotateX(0deg)`;
        glassContainer.style.transition = 'all 0.5s ease';
    });
    
    document.addEventListener('mouseenter', () => {
        glassContainer.style.transition = 'none';
    });
});
