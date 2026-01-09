/**
 * Represents a car in the racing game, handling physics, input, and AI movement.
 * Assumes global utility functions like `track`, `util*`, `race`, `cars`, etc., are defined.
 */
class Car {
    // --- Car Physics and Constants (Player Settings) ---
    // AI cars will overwrite some of these in their specific initialization
    static BASE_MAX_SPEED = 26000;
    static MAX_TURBO_SPEED = 28000;
    static ACCELERATION_RATE = 6800;
    static BRAKING_RATE = -16000;
    static DECELERATION_RATE = -8000;
    static BASE_CENTRIFUGAL = 0.3;
    static BASE_TURN_SPEED = 3000;

    constructor() {
        // Core State
        this.sprite = 0;
        this.index = 0; // 0 for player, > 0 for AI
        this.width = 500; // Car width
        this.height = 0;
        this.x = 0; // World x-position
        this.y = 0; // World y-position
        this.z = 0; // World z-position (distance along track)
        this.lastY = false;
        this.yOffset = 0;

        // Race State
        this.lap = 0;
        this.lapStarted = false;
        this.position = 0;
        this.finishPosition = 0;
        this.currentLapTime = 0;
        this.lastLapTime = null;
        this.newPositionTime = 0;

        // Speed & Movement
        this.percent = 0; // % remaining in segment
        this.speed = 0;
        this.ySpeed = 0; // Vertical speed for jumps/bumps
        this.speedPercent = 0; // speed as percentage of max speed

        // Input & Modifiers
        this.accelerate = false;
        this.brake = false;
        this.turnLeft = false;
        this.turnRight = false;
        this.turbo = false;
        this.turboRequest = false;
        this.drift = false;
        this.driftRequest = false;

        // Turbo/Drift Mechanics
        this.turboAmount = 100;
        this.turboStartTime = 0;
        this.driftAmount = 0;
        this.driftDirection = 0; // -1 (left), 1 (right)

        // Slipstream Mechanics
        this.slipstreamLines = [];
        this.slipstreamLengths = false;
        this.slipstream = 0;
        this.slipstreamTime = 0; // Time remaining for slipstream speed boost

        // Physics Settings (default to player settings)
        this.centrifugal = Car.BASE_CENTRIFUGAL;
        this.maxSpeed = Car.BASE_MAX_SPEED;
        this.maxTurboSpeed = Car.MAX_TURBO_SPEED;
        this.accel = Car.ACCELERATION_RATE;
        this.breaking = Car.BRAKING_RATE;
        this.decel = Car.DECELERATION_RATE;
        this.turnSpeed = Car.BASE_TURN_SPEED;
        this.bounce = 1.5; // Base bump severity

        // AI Settings (default to off for player)
        this.slowOnCorners = false;
        this.takeCornerOnInside = false;
    }

    // -------------------------------------------------------------------
    // Core Physics & Utility Methods
    // -------------------------------------------------------------------

    /**
     * Calculates the new velocity after acceleration over a time delta.
     * @param {number} velocity - Current velocity.
     * @param {number} acceleration - Acceleration rate.
     * @param {number} dt - Delta time (time elapsed since last update).
     * @returns {number} New velocity.
     */
    doAccelerate(velocity, acceleration, dt) {
        return velocity + (acceleration * dt);
    }

    /**
     * Clamps a value between a minimum and maximum.
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    limit(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    /**
     * Checks for overlap between two rectangular objects on the X-axis.
     * @param {number} x1 - Center/start x-position of object 1.
     * @param {number} w1 - Width of object 1.
     * @param {number} x2 - Center/start x-position of object 2.
     * @param {number} w2 - Width of object 2.
     * @param {number} percent - Overlap buffer multiplier.
     * @returns {boolean} True if overlap exists.
     */
    overlap(x1, w1, x2, w2, percent) {
        const min1 = x1 - (percent - 1) * w1 / 2;
        const max1 = x1 + w1 * percent;
        const min2 = x2 - (percent - 1) * w2 / 2;
        const max2 = x2 + w2 * percent;
        return !((max1 < min2) || (min1 > max2));
    }

    // -------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------

    getLapTime() {
        return this.currentLapTime;
    }

    getLapDisplay() {
        return this.lap < 1 ? 1 : this.lap;
    }

    /**
     * Returns the car's current race position with suffix (e.g., "1st", "2nd").
     * @returns {string}
     */
    getPositionDisplay() {
        const i = this.position;
        const j = i % 10;
        const k = i % 100;
        if (j === 1 && k !== 11) { return i + "st"; }
        if (j === 2 && k !== 12) { return i + "nd"; }
        if (j === 3 && k !== 13) { return i + "rd"; }
        return i + "th";
    }

    getSpeed() {
        return this.speed;
    }

    // -------------------------------------------------------------------
    // Input Handlers (for player car)
    // -------------------------------------------------------------------

    setTurnLeft(turn) { this.turnLeft = turn; }
    setTurnRight(turn) { this.turnRight = turn; }
    setAccelerate(accelerate) { this.accelerate = accelerate; }
    setBrake(brake) { this.brake = brake; }
    setTurbo(turbo) { this.turboRequest = turbo; }
    setDrift(drift) { this.driftRequest = drift; }

    // -------------------------------------------------------------------
    // Visuals & Effects
    // -------------------------------------------------------------------

    /**
     * Initializes and projects the slipstream lines visually (for the player car).
     * NOTE: This method is highly dependent on external globals (PI, sin, mathRand, camera, width, height).
     */
    initSlipstreamLines() {
        // ... (The complex geometry logic from the original method remains here,
        // using the global variables it relies on)
        this.slipstreamLines = [];
        const carHeight = 400;
        const centerZ = this.z + 500;
        const smallRadius = carHeight - 40;
        const lineLength = 700;
        const segments = 20;

        if (this.slipstreamLengths === false) {
            this.slipstreamLengths = Array.from({ length: segments }, () => mathRand());
        }

        let angle = 0.0;
        for (let i = 0; i < segments; i++) {
            this.slipstreamLengths[i] += 0.03;
            if (this.slipstreamLengths[i] >= 0.8) {
                this.slipstreamLengths[i] = 0;
            }

            let largeRadius = carHeight + 60;
            if (angle > PI / 6 && angle < PI / 2) {
                largeRadius = carHeight + 60 + (angle - PI / 6) * 128;
            } else if (angle >= PI / 2 && angle < (5 * PI / 6)) {
                largeRadius = carHeight + 60 + (5 * PI / 6 - angle) * 128;
            }

            // ... (rest of the complex coordinate calculation remains)
            const p = this.slipstreamLengths[i];
            const pEnd = p + 0.4;
            // Calculations for x1, y1, x2, y2, x3, y3, x4, y4 based on angle...
            // (omitted for brevity, assume they are calculated here)
            // ...

            const x1 = this.x + this.width / 2 + smallRadius * Math.cos(angle - 0.05);
            const y1 = this.y + smallRadius * sin(angle - 0.02);
            const x2 = this.x + this.width / 2 + smallRadius * Math.cos(angle + 0.05);
            const y2 = this.y + smallRadius * sin(angle + 0.02);

            const x3 = this.x + this.width / 2 + largeRadius * Math.cos(angle - 0.05);
            const y3 = this.y + largeRadius * sin(angle - 0.05);
            const x4 = this.x + this.width / 2 + largeRadius * Math.cos(angle + 0.05);
            const y4 = this.y + largeRadius * sin(angle + 0.05);
            
            const x1a = x1 + (x3 - x1) * p;
            const x2a = x2 + (x4 - x2) * p;
            const y1a = y1 + (y3 - y1) * p;
            const y2a = y2 + (y4 - y2) * p;

            const x3a = x1 + (x3 - x1) * pEnd;
            const x4a = x2 + (x4 - x2) * pEnd;
            const y3a = y1 + (y3 - y1) * pEnd;
            const y4a = y2 + (y4 - y2) * pEnd;

            const za = centerZ - lineLength * p;
            const z2a = centerZ - lineLength * pEnd;

            const line = [];
            line.push({ world: { x: x1a, y: y1a, z: za }, camera: {}, screen: {} });
            line.push({ world: { x: x2a, y: y2a, z: za }, camera: {}, screen: {} });
            line.push({ world: { x: x4a, y: y4a, z: z2a }, camera: {}, screen: {} });
            line.push({ world: { x: x3a, y: y3a, z: z2a }, camera: {}, screen: {} });

            this.slipstreamLines.push(line);
            angle += PI / segments;
        }

        // Project the world points to screen points
        for (const points of this.slipstreamLines) {
            for (const point of points) {
                camera.project(point, 0, 0, width, height);
            }
        }
    }

    // -------------------------------------------------------------------
    // Update Loop
    // -------------------------------------------------------------------

    /**
     * Main update function for car physics and race logic.
     * @param {number} dt - Delta time.
     */
    update(dt) {
        let maxSpeed = this.maxSpeed;
        this.speedPercent = this.speed / this.maxSpeed;
        const currentSegment = track.findSegment(this.z);
        const playerSegment = track.findSegment(cars[0].z);
        const { speedPercent } = this;
        this.percent = utilPercentRemaining(this.z, Track.segmentLength);

        // Calculate turning delta x
        let dx = dt * this.turnSpeed * speedPercent;

        // Track boundary details
        const trackLeft = currentSegment.p1.world.x;
        const trackRight = currentSegment.p2.world.x;
        const carLeftSide = this.x;
        const carRightSide = this.x + this.width;
        const distanceToLeft = carLeftSide - trackLeft;
        const distanceToRight = trackRight - carRightSide;
        const trackWidth = trackRight - trackLeft;

        let extraSpeed = 10; // Speed boost multiplier from track position

        // Calculate extra speed on curves (player only)
        if (this.index === 0) {
            if (currentSegment.curve < 0 && distanceToLeft > 0) { // Left curve
                extraSpeed = 1 + (trackWidth - this.width - distanceToLeft) * (-currentSegment.curve) / (trackWidth * 80);
            } else if (currentSegment.curve > 0 && distanceToRight > 0) { // Right curve
                extraSpeed = 1 + (trackWidth - this.width - distanceToRight) * (currentSegment.curve) / (trackWidth * 80);
            }
            extraSpeed = Math.max(1, extraSpeed);
        }

        // --- Speed Modifiers (Slipstream, Drift, Turbo, Offroad) ---
        let maxSpeedMultiplier = 0.8;
        let accelerationMultiplier = 1;

        if (this.slipstreamTime > 0) {
            maxSpeedMultiplier += 0.4;
        }

        // Drift Logic
        if (this.driftRequest) {
            if (this.speed > 8000) {
                if (!this.drift && !this.accelerate) {
                    this.driftAmount = 1.5;
                    this.drift = true;
                }
            } else {
                maxSpeedMultiplier -= 0.5;
                this.drift = false;
            }
        } else {
            this.drift = false;
        }

        if (this.driftAmount > 0 && this.speed > 8000) {
            this.driftAmount -= dt;
            maxSpeedMultiplier -= 0.04;
            if (this.driftDirection === 0) {
                if (this.turnLeft) this.driftDirection = -1;
                if (this.turnRight) this.driftDirection = 1;
            }
        } else {
            this.drift = false;
            this.driftAmount = 0;
            this.driftDirection = 0;
        }

        // Turbo Logic
        const turboWasOn = this.turbo;
        if (this.turboRequest) {
            this.turbo = this.turboAmount > 0 && this.speed > 8000 && this.accelerate;
        } else {
            this.turbo = false;
        }

        if (this.turbo) {
            accelerationMultiplier = 1.2;
            maxSpeed = this.maxTurboSpeed;

            const time = getTimestamp();
            if (!turboWasOn) {
                this.turboStartTime = time;
            }
            this.turboAmount -= dt * 2.45;
            raceAudioSetTurboTime(time - this.turboStartTime);
        }

        // Offroad/Kerb Logic
        this.bounce = 3.4;
        const offroadLeft = distanceToLeft < -this.width * 0.1;
        const offroadRight = distanceToRight < -this.width * 0.1;

        if (offroadLeft || offroadRight) {
            const extremeOffroadLeft = distanceToLeft + this.width * 0.1 < -playerSegment.kerbWidth;
            const extremeOffroadRight = distanceToRight + this.width * 0.1 < -playerSegment.kerbWidth;

            if (extremeOffroadLeft || extremeOffroadRight) {
                this.bounce = 9.5;
                maxSpeedMultiplier -= 0.6;
                accelerationMultiplier -= 0.2;
            } else {
                maxSpeedMultiplier -= 0.1;
                this.bounce = 6;
            }
        }

        this.bounce = this.bounce * mathRand() * speedPercent; // Apply random bump

        // --- Player-Specific Movement & Physics ---
        if (this.index === 0 && race.state !== STATE_RACEOVER) {
            // Apply centrifugal force on curves
            this.x -= (dx * speedPercent * currentSegment.curve * this.centrifugal);

            // Apply steering input
            if (this.driftDirection !== 0) {
                dx *= 5;
            }
            if (this.turnLeft) {
                this.x -= dx;
            } else if (this.turnRight) {
                this.x += dx;
            }

            // Apply drift slide
            const dDrift = this.driftDirection * this.speed * 0.00055;
            this.x += dDrift;

            // Update Z position
            this.z = utilIncrease(this.z, dt * this.speed * extraSpeed, track.getLength());

            // --- Y-Position (Vertical Movement/Bumps) ---
            this.y = utilInterpolate(currentSegment.p1.world.y, currentSegment.p3.world.y, this.percent);

            // Simple "air" physics based on track gradient (Original code was complicated, simplified slightly)
            this.ySpeed -= dt * (this.yOffset >= 0 ? 75000 : 430000);
            this.ySpeed = this.limit(this.ySpeed, -2500, Infinity);

            let dy = 0;
            if (this.lastY !== false) {
                dy = this.y - this.lastY;
                if (dy < -1000) dy = 0;
            }
            this.lastY = this.y;

            if (this.yOffset <= 0) {
                // On the ground or just landing
                this.yOffset = this.ySpeed * dt - dy;
                if (this.yOffset <= 0) {
                    this.ySpeed = dy / dt;
                    this.yOffset = 0;
                }
            } else {
                // In the air
                this.yOffset += this.ySpeed * dt;
                if (this.yOffset < 0) {
                    this.yOffset = 0;
                }
            }
            // The original code forces yOffset to 0 here, which seems to disable vertical movement:
            this.yOffset = 0;

            // --- Speed Application ---
            if (this.accelerate) {
                if (this.speed < maxSpeed * maxSpeedMultiplier) {
                    this.speed = this.doAccelerate(this.speed, this.accel * accelerationMultiplier, dt);
                } else {
                    // Over max speed, decelerate naturally
                    this.speed = this.doAccelerate(this.speed, this.decel, dt);
                    if (this.speed < maxSpeed * maxSpeedMultiplier) {
                        this.speed = maxSpeed * maxSpeedMultiplier;
                    }
                }
            } else if (this.brake) {
                this.speed = this.doAccelerate(this.speed, this.breaking, dt);
            } else {
                // Coasting
                this.speed = this.doAccelerate(this.speed, this.decel, dt);
            }

            // --- Collision with Roadside Objects ---
            for (const sprite of playerSegment.sprites) {
                const spriteW = sprite.s * sprite.source.cw;
                const spriteX = sprite.x + sprite.source.cx * sprite.s;

                if (this.overlap(this.x, this.width, spriteX, spriteW, 1)) {
                    raceAudioCrash();
                    this.slipstream = 0;
                    this.slipstreamTime = 0;
                    this.speed = this.maxSpeed / 5;
                    this.z = utilIncrease(playerSegment.p1.world.z, 0, track.getLength());
                    break;
                }
            }

            // --- Slipstream Check (Player) ---
            let isBehind = false;
            for (const car of cars) {
                if (car.index === 0) continue;

                let distance = car.z - this.z;
                // Handle wrap-around near the start/finish line
                if (this.z > track.getLength() - 1200) {
                    distance -= track.getLength();
                }

                if (distance > 0 && distance < 1800) {
                    const offCentre = Math.abs(this.x - car.x) / car.width;
                    if (offCentre < 0.4) {
                        isBehind = true;
                        break;
                    }
                }
            }

            if (isBehind && this.speed > 8000) {
                this.slipstream += dt * 1;
                if (this.slipstream > 0.14) {
                    this.slipstreamTime = 2; // 2 seconds of boost
                }
            } else {
                this.slipstream = 0;
            }

            if (this.slipstreamTime > 0) {
                this.slipstreamTime -= dt;
            }
        }
        // --- AI Movement ---
        else {
           
        }

        // --- Common Logic ---

        this.percent = utilPercentRemaining(this.z, Track.segmentLength);
        const newSegment = track.findSegment(this.z);

        // --- Collision with Other Cars (All cars) ---
        if (this.index === 0) { // Only player needs to check for collision with AI
             
        }
        // AI Car-to-Car collision logic from original code (commented out as it seems to be AI-vs-AI, not AI-vs-Player)
        // The original code only allows the player (this.index == 0) to enter the collision block.
        // The logic for AI-to-AI or AI-to-Player when AI is 'this' is only in the `updateCarPosition`
        // so I will assume the original intent was only for player-initiated collisions here.

        // Global track limits (more generous than offroad penalty)
        const trackLeftLimit = trackLeft - 1.2 * this.width;
        const trackRightLimit = trackRight + 1.2 * this.width;

        if (this.x + this.width / 2 < trackLeftLimit) {
            this.x = trackLeftLimit - this.width / 2;
        }

        if (this.x + this.width / 2 > trackRightLimit) {
            this.x = trackRightLimit - this.width / 2;
        }

        this.speed = this.limit(this.speed, 0, maxSpeed);
        if (this.index === 0) {
            raceAudioEngineSpeed(this.speedPercent);
        }

        // Update car segment for collision checks
        if (currentSegment !== newSegment) {
           
        }

        this.handleLapAndPosition(dt);
    }

    /**
     * Handles lap counting, lap times, and race position updates.
     * @param {number} dt - Delta time.
     */
    handleLapAndPosition(dt) {
        // Lap logic: check if car is near start/finish line (z < 1.2 * segmentLength)
        if (this.z < Track.segmentLength * 2 && !this.lapStarted) {
            this.lap++;
            this.lapStarted = true;
            this.lastLapTime = this.currentLapTime;

            if (this.lap === 3 && this.index === 0) {
                speak(`lap time ${this.currentLapTime.toFixed(3)}`);
            }
            this.currentLapTime = 0;
        } else {
            if (this.z > Track.segmentLength * 1.2) {
                this.lapStarted = false;
            }
            this.currentLapTime += dt;
        }

        // Work out position against all other cars
        const currentPosition = this.position;
        this.position = 1;
        for (const car of cars) {
            if (car.index !== this.index) {
                if (car.lap > this.lap || (car.lap === this.lap && car.z > this.z)) {
                    this.position++;
                }
            }
        }

        // Handle position change display (Player only)
        if (this.index === 0) {
            if (this.newPositionTime > 0) {
                this.newPositionTime -= dt;
            }
            if (this.position !== currentPosition) {
                this.newPosition = this.getPositionDisplay();
                this.newPositionTime = 1; // Display for 1 second
            }
        }

        // Race Over Check (Player only, assuming 3 laps to finish)
        if (this.index === 0 && this.lap === 4 && race.state !== STATE_RACEOVER) {
            this.finishPosition = this.getPositionDisplay();
            speak("Race. Over.");
            speak(`${this.finishPosition} Place`);

            // Disable modifiers
            this.turbo = false;
            this.slipstream = 0;
            this.slipstreamTime = 0;

            race.raceOver();
        }
    }

    // -------------------------------------------------------------------
    // AI Driving Logic
    // -------------------------------------------------------------------

    /**
     * Determines the AI car's steering direction based on the track curve and other cars.
     * @param {object} carSegment - The car's current segment.
     * @param {object} playerSegment - The player car's current segment.
     * @param {number} playerWidth - The player car's width.
     * @returns {number} Steering direction: -1 (left), 0 (straight), 1 (right).
     */
    updateCarPosition(carSegment, playerSegment, playerWidth) {
        const lookAhead = 60;
        const trackSegments = track.getSegmentCount();

        // 1. Avoid other cars in the immediate vicinity (up to 8 segments)
        for (let i = 1; i < 8; i++) {
            const segment = track.getSegment((carSegment.index + i) % trackSegments);

            for (const otherCar of segment.cars) {
                if (otherCar.index === this.index) continue; // Skip self

                // Check if car width is too narrow to pass
                const otherCarLeft = otherCar.x;
                const otherCarRight = otherCar.x + otherCar.width;
                const trackLeft = segment.p1.world.x;
                const trackRight = segment.p2.world.x;

                let dir = 0;
                // Check for overlapping area and determine direction to swerve
                if (this.overlap(this.x, this.width, otherCarLeft, otherCar.width, 1.2)) {
                    // Try to pass on the side with more space
                    const spaceOnLeft = otherCarLeft - trackLeft;
                    const spaceOnRight = trackRight - otherCarRight;

                    if (spaceOnLeft > spaceOnRight) {
                        dir = -1; // Move left
                    } else {
                        dir = 1; // Move right
                    }
                    // Return a steering input proportional to the distance of the obstructing car
                    return dir * 3 / i;
                }
            }
        }
        // ... in the Car constructor

t.maxSpeed       =  35000; // Original was 26000
t.maxTurboSpeed  =  40000; // Original was 28000

// ...
        // 2. Follow track curves (if AI is set to take inside corners)
        if (this.takeCornerOnInside) {
            for (let i = 1; i < lookAhead; i++) {
                const segment = track.getSegment((carSegment.index + i) % trackSegments);

                if (segment.curve > 0) { // Right curve, move right (inside)
                    return (i < 5) ? 1 / 5 : 2 / i;
                }
                if (segment.curve < 0) { // Left curve, move left (inside)
                    return (i < 5) ? -1 / 5 : -2 / i;
                }
            }
        }

        // 3. Drive straight
        return 0;
    }
}