/* ================================================
   SAKURA - Cherry blossom petal animation
   Pure CSS-driven with JS for petal generation
   ================================================ */

const Sakura = {
    container: null,
    petals: [],
    maxPetals: 20,
    isRunning: false,

    init(containerId = 'sakura-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.addStyles();
        this.start();
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        for (let i = 0; i < this.maxPetals; i++) {
            setTimeout(() => this.createPetal(), i * 300);
        }
    },

    stop() {
        this.isRunning = false;
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.petals = [];
    },

    createPetal() {
        if (!this.isRunning || !this.container) return;

        const petal = document.createElement('div');
        petal.className = 'sakura-petal';

        const size = 8 + Math.random() * 12;
        const startX = Math.random() * 100;
        const duration = 6 + Math.random() * 8;
        const delay = Math.random() * 4;
        const swayAmount = 30 + Math.random() * 60;

        petal.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            right: ${startX}%;
            top: -20px;
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            --sway: ${swayAmount}px;
        `;

        this.container.appendChild(petal);

        petal.addEventListener('animationend', () => {
            petal.remove();
            if (this.isRunning) {
                setTimeout(() => this.createPetal(), Math.random() * 2000);
            }
        });
    },

    addStyles() {
        if (document.getElementById('sakura-styles')) return;

        const style = document.createElement('style');
        style.id = 'sakura-styles';
        style.textContent = `
            .sakura-petal {
                position: absolute;
                background: radial-gradient(ellipse at center, #FFB7C5 0%, #FF69B4 50%, transparent 70%);
                border-radius: 50% 0 50% 50%;
                opacity: 0;
                pointer-events: none;
                animation-name: sakuraFall;
                animation-timing-function: ease-in-out;
                animation-iteration-count: 1;
                animation-fill-mode: forwards;
                z-index: 1;
            }

            @keyframes sakuraFall {
                0% {
                    opacity: 0;
                    transform: translateX(0) translateY(0) rotate(0deg) scale(0.5);
                }
                10% {
                    opacity: 0.8;
                    transform: translateX(calc(var(--sway) * 0.1)) translateY(30px) rotate(36deg) scale(1);
                }
                30% {
                    opacity: 0.9;
                    transform: translateX(calc(var(--sway) * -0.3)) translateY(100px) rotate(108deg);
                }
                50% {
                    opacity: 0.7;
                    transform: translateX(calc(var(--sway) * 0.5)) translateY(200px) rotate(180deg);
                }
                70% {
                    opacity: 0.5;
                    transform: translateX(calc(var(--sway) * -0.2)) translateY(320px) rotate(252deg);
                }
                100% {
                    opacity: 0;
                    transform: translateX(calc(var(--sway) * 0.3)) translateY(450px) rotate(360deg) scale(0.3);
                }
            }
        `;
        document.head.appendChild(style);
    }
};
