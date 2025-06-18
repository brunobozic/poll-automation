/**
 * Advanced Media and Attention Verification Handler
 * Handles sophisticated media-based anti-bot protections including:
 * - Audio/video permission requests
 * - Media playback verification
 * - Attention monitoring bypass
 * - Engagement simulation
 * - Background audio generation
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class AdvancedMediaHandler extends EventEmitter {
    constructor(page, options = {}) {
        super();
        this.page = page;
        this.options = {
            enableAudioSimulation: options.enableAudioSimulation !== false,
            enableVideoPlayback: options.enableVideoPlayback !== false,
            enablePermissionHandling: options.enablePermissionHandling !== false,
            enableEngagementSimulation: options.enableEngagementSimulation !== false,
            humanizedInteractions: options.humanizedInteractions !== false,
            ...options
        };
        
        this.mediaState = {
            audioPermissionGranted: false,
            videoPermissionGranted: false,
            currentlyPlayingMedia: new Set(),
            mediaInteractions: [],
            attentionEvents: [],
            backgroundAudioEnabled: false
        };
        
        this.engagementPatterns = {
            scrollDuringVideo: true,
            pauseAndResume: 0.1, // 10% chance
            volumeAdjustments: 0.15, // 15% chance
            fullscreenToggle: 0.05, // 5% chance
            seekBehavior: 0.08 // 8% chance
        };
    }

    async initialize() {
        console.log('🎬 Initializing Advanced Media Handler...');
        
        try {
            // Setup permission handling
            await this.setupPermissionHandling();
            
            // Setup media event listeners
            await this.setupMediaEventListeners();
            
            // Setup engagement simulation
            await this.setupEngagementSimulation();
            
            // Setup background audio simulation
            await this.setupBackgroundAudioSimulation();
            
            console.log('✅ Advanced Media Handler initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize media handler:', error);
            throw error;
        }
    }

    async setupPermissionHandling() {
        console.log('  🔐 Setting up permission handling...');
        
        // Override permission API to simulate human-like responses
        await this.page.addInitScript(() => {
            // Store original methods
            const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
            const originalPermissionsQuery = navigator.permissions?.query;
            
            // Create realistic permission delays
            function humanPermissionDelay() {
                return new Promise(resolve => {
                    // Simulate human thinking time: 1-4 seconds
                    const delay = 1000 + Math.random() * 3000;
                    setTimeout(resolve, delay);
                });
            }
            
            // Override getUserMedia to simulate human permission granting
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia = async function(constraints) {
                    console.log('🎤 Permission request detected:', constraints);
                    
                    // Simulate human delay
                    await humanPermissionDelay();
                    
                    // Create mock media stream
                    const mockStream = {
                        id: 'mock-stream-' + Date.now(),
                        active: true,
                        getAudioTracks: () => constraints.audio ? [{
                            id: 'mock-audio-track',
                            kind: 'audio',
                            label: 'Default - Microphone (Built-in)',
                            enabled: true,
                            muted: false,
                            readyState: 'live',
                            stop: () => {},
                            addEventListener: () => {},
                            removeEventListener: () => {}
                        }] : [],
                        getVideoTracks: () => constraints.video ? [{
                            id: 'mock-video-track',
                            kind: 'video',
                            label: 'Default - Camera (Built-in)',
                            enabled: true,
                            muted: false,
                            readyState: 'live',
                            stop: () => {},
                            addEventListener: () => {},
                            removeEventListener: () => {}
                        }] : [],
                        getTracks: function() {
                            return [...this.getAudioTracks(), ...this.getVideoTracks()];
                        },
                        addTrack: () => {},
                        removeTrack: () => {},
                        clone: () => mockStream,
                        addEventListener: () => {},
                        removeEventListener: () => {}
                    };
                    
                    // Trigger permission events
                    if (constraints.audio) {
                        window.dispatchEvent(new CustomEvent('audioPermissionGranted'));
                    }
                    if (constraints.video) {
                        window.dispatchEvent(new CustomEvent('videoPermissionGranted'));
                    }
                    
                    return mockStream;
                };
            }
            
            // Override permissions API
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query = async function(permissionDescriptor) {
                    await humanPermissionDelay();
                    
                    // Return granted for media permissions
                    if (permissionDescriptor.name === 'microphone' || 
                        permissionDescriptor.name === 'camera') {
                        return {
                            state: 'granted',
                            name: permissionDescriptor.name,
                            addEventListener: () => {},
                            removeEventListener: () => {}
                        };
                    }
                    
                    // Call original for other permissions
                    return originalPermissionsQuery ? 
                        originalPermissionsQuery.call(this, permissionDescriptor) :
                        { state: 'granted', name: permissionDescriptor.name };
                };
            }
            
            // Setup ambient audio simulation
            window.ambientAudioSimulator = {
                generateBackgroundNoise() {
                    // Simulate background ambient noise
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    // Very low volume pink noise
                    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
                    oscillator.frequency.setValueAtTime(440 + Math.random() * 100, audioContext.currentTime);
                    oscillator.type = 'sawtooth';
                    
                    oscillator.start();
                    
                    // Vary the frequency slightly to simulate ambient noise
                    setInterval(() => {
                        if (audioContext.state === 'running') {
                            oscillator.frequency.setValueAtTime(
                                440 + Math.random() * 100, 
                                audioContext.currentTime
                            );
                        }
                    }, 2000);
                    
                    return { oscillator, gainNode, audioContext };
                }
            };
        });
    }

    async setupMediaEventListeners() {
        console.log('  📺 Setting up media event listeners...');
        
        // Monitor for media permission events
        await this.page.addInitScript(() => {
            window.addEventListener('audioPermissionGranted', () => {
                console.log('🎤 Audio permission granted simulation');
                window.mediaHandlerState = window.mediaHandlerState || {};
                window.mediaHandlerState.audioPermissionGranted = true;
            });
            
            window.addEventListener('videoPermissionGranted', () => {
                console.log('📹 Video permission granted simulation');
                window.mediaHandlerState = window.mediaHandlerState || {};
                window.mediaHandlerState.videoPermissionGranted = true;
            });
        });
        
        // Setup video/audio element monitoring  
        await this.page.addInitScript(() => {
            // Override video/audio element methods for engagement simulation
            const originalVideoPlay = HTMLVideoElement.prototype.play;
            const originalAudioPlay = HTMLAudioElement.prototype.play;
            
            HTMLVideoElement.prototype.play = function() {
                console.log('📺 Video play detected');
                
                // Simulate realistic playback behavior
                this.addEventListener('loadstart', () => {
                    window.dispatchEvent(new CustomEvent('videoLoadStart', { detail: { element: this } }));
                });
                
                this.addEventListener('canplay', () => {
                    window.dispatchEvent(new CustomEvent('videoCanPlay', { detail: { element: this } }));
                });
                
                this.addEventListener('play', () => {
                    window.dispatchEvent(new CustomEvent('videoPlay', { detail: { element: this } }));
                });
                
                this.addEventListener('ended', () => {
                    window.dispatchEvent(new CustomEvent('videoEnded', { detail: { element: this } }));
                });
                
                // Add realistic viewing behaviors
                setTimeout(() => {
                    // Simulate brief pause for loading
                    if (Math.random() < 0.1) { // 10% chance
                        this.pause();
                        setTimeout(() => this.play(), 500 + Math.random() * 1500);
                    }
                }, 2000 + Math.random() * 3000);
                
                return originalVideoPlay.call(this);
            };
            
            HTMLAudioElement.prototype.play = function() {
                console.log('🔊 Audio play detected');
                
                this.addEventListener('play', () => {
                    window.dispatchEvent(new CustomEvent('audioPlay', { detail: { element: this } }));
                });
                
                this.addEventListener('ended', () => {
                    window.dispatchEvent(new CustomEvent('audioEnded', { detail: { element: this } }));
                });
                
                return originalAudioPlay.call(this);
            };
        });
    }

    async setupEngagementSimulation() {
        console.log('  👁️ Setting up engagement simulation...');
        
        // Listen for media events and simulate human engagement (only if page has event capabilities)
        if (this.page && typeof this.page.on === 'function') {
            this.page.on('console', async (msg) => {
                const text = msg.text();
                
                if (text.includes('Video play detected') || text.includes('Audio play detected')) {
                    // Start engagement simulation
                    await this.simulateMediaEngagement();
                }
            });
        }
        
        // Setup page interaction monitoring (only if page supports it)
        if (this.page && typeof this.page.addInitScript === 'function') {
            await this.page.addInitScript(() => {
            let engagementTimer;
            let interactionCount = 0;
            
            window.addEventListener('videoPlay', async (event) => {
                const video = event.detail.element;
                
                // Clear any existing timer
                if (engagementTimer) clearInterval(engagementTimer);
                
                // Start engagement simulation
                engagementTimer = setInterval(() => {
                    interactionCount++;
                    
                    // Simulate various engagement behaviors
                    const behaviors = [
                        () => {
                            // Simulate volume check
                            if (Math.random() < 0.05) {
                                const currentVolume = video.volume;
                                video.volume = Math.max(0.1, Math.min(1.0, currentVolume + (Math.random() - 0.5) * 0.1));
                            }
                        },
                        () => {
                            // Simulate seeking (rarely)
                            if (Math.random() < 0.02 && video.duration > 30) {
                                const currentTime = video.currentTime;
                                const newTime = Math.max(0, currentTime - 5 + Math.random() * 10);
                                video.currentTime = Math.min(newTime, video.duration);
                            }
                        },
                        () => {
                            // Simulate focus/blur events
                            if (Math.random() < 0.03) {
                                window.dispatchEvent(new Event('blur'));
                                setTimeout(() => {
                                    window.dispatchEvent(new Event('focus'));
                                }, 1000 + Math.random() * 3000);
                            }
                        }
                    ];
                    
                    // Execute random behavior
                    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
                    behavior();
                    
                }, 5000 + Math.random() * 10000); // Every 5-15 seconds
                
                // Clear timer when video ends
                video.addEventListener('ended', () => {
                    if (engagementTimer) {
                        clearInterval(engagementTimer);
                        engagementTimer = null;
                    }
                });
            });
            });
        }
    }

    async setupBackgroundAudioSimulation() {
        if (!this.options.enableAudioSimulation) return;
        
        console.log('  🎵 Setting up background audio simulation...');
        
        await this.page.addInitScript(() => {
            // Create subtle background audio context
            function initializeBackgroundAudio() {
                try {
                    const backgroundAudio = window.ambientAudioSimulator?.generateBackgroundNoise();
                    
                    if (backgroundAudio) {
                        window.backgroundAudioContext = backgroundAudio;
                        console.log('🎵 Background audio simulation started');
                        
                        // Periodically adjust to simulate real environment
                        setInterval(() => {
                            if (backgroundAudio.gainNode && Math.random() < 0.3) {
                                const newGain = 0.0005 + Math.random() * 0.0015;
                                backgroundAudio.gainNode.gain.setValueAtTime(
                                    newGain, 
                                    backgroundAudio.audioContext.currentTime
                                );
                            }
                        }, 10000 + Math.random() * 20000);
                    }
                } catch (error) {
                    console.log('Background audio simulation failed:', error);
                }
            }
            
            // Start background audio after user interaction
            document.addEventListener('click', initializeBackgroundAudio, { once: true });
            document.addEventListener('touchstart', initializeBackgroundAudio, { once: true });
        });
    }

    async simulateMediaEngagement() {
        // Simulate human-like media engagement behaviors
        const engagementActions = [
            () => this.simulateVolumeAdjustment(),
            () => this.simulateScrollDuringVideo(),
            () => this.simulateAttentionShift(),
            () => this.simulateDeviceMovement()
        ];
        
        // Schedule random engagement behaviors
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const action = engagementActions[Math.floor(Math.random() * engagementActions.length)];
                action();
            }, Math.random() * 30000); // Within 30 seconds
        }
    }

    async simulateVolumeAdjustment() {
        if (Math.random() < this.engagementPatterns.volumeAdjustments) {
            try {
                await this.page.evaluate(() => {
                    const videos = document.querySelectorAll('video');
                    const audios = document.querySelectorAll('audio');
                    
                    [...videos, ...audios].forEach(media => {
                        if (!media.paused) {
                            // Slight volume adjustment
                            const currentVolume = media.volume;
                            const adjustment = (Math.random() - 0.5) * 0.2; // ±10%
                            media.volume = Math.max(0.1, Math.min(1.0, currentVolume + adjustment));
                        }
                    });
                });
                
                console.log('🔊 Simulated volume adjustment');
            } catch (error) {
                console.log('Volume adjustment simulation failed:', error);
            }
        }
    }

    async simulateScrollDuringVideo() {
        if (Math.random() < 0.3) { // 30% chance
            try {
                // Small scroll movements during video playback
                const scrollAmount = 50 + Math.random() * 100;
                await this.page.evaluate((amount) => {
                    window.scrollBy({
                        top: (Math.random() > 0.5 ? 1 : -1) * amount,
                        behavior: 'smooth'
                    });
                }, scrollAmount);
                
                console.log('📜 Simulated scroll during video');
            } catch (error) {
                console.log('Scroll simulation failed:', error);
            }
        }
    }

    async simulateAttentionShift() {
        if (Math.random() < 0.15) { // 15% chance
            try {
                // Simulate brief attention shift (mouse movement away from video)
                const viewport = this.page.viewportSize();
                const randomX = Math.random() * viewport.width;
                const randomY = Math.random() * viewport.height;
                
                await this.page.mouse.move(randomX, randomY, { steps: 10 });
                
                // Move back after brief delay
                setTimeout(async () => {
                    const videos = await this.page.$$('video');
                    if (videos.length > 0) {
                        const video = videos[0];
                        const box = await video.boundingBox();
                        if (box) {
                            await this.page.mouse.move(
                                box.x + box.width / 2,
                                box.y + box.height / 2,
                                { steps: 8 }
                            );
                        }
                    }
                }, 2000 + Math.random() * 3000);
                
                console.log('👁️ Simulated attention shift');
            } catch (error) {
                console.log('Attention shift simulation failed:', error);
            }
        }
    }

    async simulateDeviceMovement() {
        // Simulate subtle device movement (affects accelerometer/gyroscope)
        try {
            await this.page.evaluate(() => {
                // Simulate device orientation changes
                if (window.DeviceOrientationEvent) {
                    const event = new DeviceOrientationEvent('deviceorientation', {
                        alpha: Math.random() * 360,
                        beta: -90 + Math.random() * 180,
                        gamma: -90 + Math.random() * 180,
                        absolute: false
                    });
                    window.dispatchEvent(event);
                }
                
                // Simulate device motion
                if (window.DeviceMotionEvent) {
                    const motionEvent = new DeviceMotionEvent('devicemotion', {
                        acceleration: {
                            x: (Math.random() - 0.5) * 2,
                            y: (Math.random() - 0.5) * 2,
                            z: (Math.random() - 0.5) * 2
                        },
                        accelerationIncludingGravity: {
                            x: (Math.random() - 0.5) * 10,
                            y: (Math.random() - 0.5) * 10,
                            z: 9.8 + (Math.random() - 0.5) * 2
                        },
                        rotationRate: {
                            alpha: (Math.random() - 0.5) * 10,
                            beta: (Math.random() - 0.5) * 10,
                            gamma: (Math.random() - 0.5) * 10
                        },
                        interval: 16
                    });
                    window.dispatchEvent(motionEvent);
                }
            });
            
            console.log('📱 Simulated device movement');
        } catch (error) {
            console.log('Device movement simulation failed:', error);
        }
    }

    async handleVideoPlayback(videoElement) {
        try {
            console.log('📺 Handling video playback verification...');
            
            // Wait for video to be ready
            await this.page.waitForFunction(
                (video) => video.readyState >= 2, // HAVE_CURRENT_DATA
                {},
                videoElement
            );
            
            // Get video duration and simulate realistic viewing
            const duration = await videoElement.evaluate(el => el.duration);
            
            if (duration && duration > 0) {
                // Simulate watching the video with human-like patterns
                await this.simulateVideoWatching(videoElement, duration);
                
                // Record interaction
                this.mediaState.mediaInteractions.push({
                    type: 'video',
                    duration: duration,
                    timestamp: Date.now(),
                    completed: true
                });
            }
            
        } catch (error) {
            console.error('Video playback handling failed:', error);
        }
    }

    async simulateVideoWatching(videoElement, duration) {
        const watchingTime = Math.min(duration, 30 + Math.random() * 60); // Watch 30-90 seconds max
        const checkInterval = 2000; // Check every 2 seconds
        
        for (let elapsed = 0; elapsed < watchingTime; elapsed += checkInterval) {
            await this.page.waitForTimeout(checkInterval);
            
            // Occasionally simulate interactions
            if (Math.random() < 0.1) { // 10% chance every 2 seconds
                await this.simulateVideoInteraction(videoElement);
            }
            
            // Check if video is still playing
            const isPlaying = await videoElement.evaluate(el => !el.paused && !el.ended);
            if (!isPlaying) break;
        }
    }

    async simulateVideoInteraction(videoElement) {
        const interactions = [
            async () => {
                // Simulate pause/play
                if (Math.random() < this.engagementPatterns.pauseAndResume) {
                    await videoElement.click(); // Pause
                    await this.page.waitForTimeout(1000 + Math.random() * 3000);
                    await videoElement.click(); // Resume
                }
            },
            async () => {
                // Simulate seeking
                if (Math.random() < this.engagementPatterns.seekBehavior) {
                    await videoElement.evaluate(el => {
                        const newTime = Math.max(0, el.currentTime - 5 + Math.random() * 10);
                        el.currentTime = Math.min(newTime, el.duration);
                    });
                }
            },
            async () => {
                // Simulate fullscreen toggle
                if (Math.random() < this.engagementPatterns.fullscreenToggle) {
                    await videoElement.evaluate(el => {
                        if (el.requestFullscreen) {
                            el.requestFullscreen().catch(() => {});
                            setTimeout(() => {
                                if (document.exitFullscreen) {
                                    document.exitFullscreen().catch(() => {});
                                }
                            }, 2000 + Math.random() * 8000);
                        }
                    });
                }
            }
        ];
        
        const interaction = interactions[Math.floor(Math.random() * interactions.length)];
        await interaction();
    }

    async getMediaState() {
        return {
            ...this.mediaState,
            timestamp: Date.now(),
            engagementScore: this.calculateEngagementScore()
        };
    }

    calculateEngagementScore() {
        const interactions = this.mediaState.mediaInteractions.length;
        const attentionEvents = this.mediaState.attentionEvents.length;
        
        // Simple engagement scoring
        let score = 0.5; // Base score
        
        if (interactions > 0) score += Math.min(0.3, interactions * 0.1);
        if (attentionEvents > 0) score += Math.min(0.2, attentionEvents * 0.05);
        if (this.mediaState.audioPermissionGranted) score += 0.1;
        if (this.mediaState.videoPermissionGranted) score += 0.1;
        
        return Math.min(1.0, score);
    }
}

module.exports = AdvancedMediaHandler;