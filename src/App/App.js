import kind from '@enact/core/kind';
import hoc from '@enact/core/hoc';
import {Job} from '@enact/core/util';
import {toCapitalized} from '@enact/i18n/util';
import {Layout, Cell} from '@enact/ui/Layout';
import Toggleable from '@enact/ui/Toggleable';
import Touchable from '@enact/ui/Touchable';
import Transition from '@enact/ui/Transition';
import BodyText from '@enact/moonstone/BodyText';
import IconButton from '@enact/moonstone/IconButton';
import Makeup from '../components/Makeup';
import Button from '@enact/moonstone/Button';
import ToggleButton from '@enact/moonstone/ToggleButton';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import controlsMap from '../controlsMap';
import emotions from '../emotions';
import visionMap from '../visionMap';
import perceivedEmotionMap from '../perceivedEmotionMap';
import connect from '../data/bot';
import Head from '../views/Head';
import ControllerIcon from '../components/ControllerIcon';

// Assets
import birdtheword from '../../assets/sounds/birdtheword.mp3';
import sadtrombone from '../../assets/sounds/sadtrombone.mp3';
import trollolol from '../../assets/sounds/trollolol.mp3';

import css from './App.module.less';


// Movement speeds based on combined wheel velocity percentages 200% is both wheels full.
const MOVEMENT = {
	IDLE : 0,
	SLOW : 0.1,
	HALF : 1,
	FULL : 1.9
};


const makeTogglerName = (em) => 'toggle' + toCapitalized(em);

// Convert to the final, more elaborate, format so we don't have to check later on
function normalizeMap (mapping) {
	for (const item in mapping) {
		if (typeof mapping[item] === 'string' || Array.isArray(mapping[item])) {
			// Reassign to be an object and finish normalizing these two types later...
			mapping[item] = {
				emotion: mapping[item]
			};
		}

		// Now that we know it's an object, let's normalize thees keys
		if (mapping[item].emotion && typeof mapping[item].emotion === 'string') {
			mapping[item].emotion = [mapping[item].emotion];
		}
		// Sound key can be either a string or an object. If it's an object, use it
		// directly, otherwise build a basic object and use that.
		if (mapping[item].sound && typeof mapping[item].sound === 'string') {
			mapping[item].sound = {src: mapping[item].sound};
		}
	}
	return mapping;
}

// Normalize visionMap
normalizeMap(perceivedEmotionMap);
normalizeMap(visionMap);

const togglePropTypes = {};
for (const em in emotions) {
	togglePropTypes[makeTogglerName(em)] = PropTypes.func;
}

const TappableHead = Touchable(Head);

const App = kind({
	name: 'App',

	propTypes: {
		...togglePropTypes,
		active: PropTypes.bool,
		connected: PropTypes.bool,
		controllerMode: PropTypes.string,
		handleMockData: PropTypes.func,
		handleReconnect: PropTypes.func,
		handleSimBackward: PropTypes.func,
		handleSimForward: PropTypes.func,
		handleSimLeft: PropTypes.func,
		handleSimRight: PropTypes.func,
		handleSimStop: PropTypes.func,
		handleToggleDebug: PropTypes.func,
		label: PropTypes.string,
		manualControl: PropTypes.bool
	},

	defaultProps: {
		label: '<N/A>',
		active: false
	},

	styles: {
		css,
		className: 'app enact-unselectable'
	},

	computed: {
		className: ({debug, expression, styler}) => styler.append({debug}, expression) // also output the expression classes here, in case the UI should respond differently given an expression
	},

	render: ({expression, active, connected, controllerMode, debug, debugReadout, handleControllerMode, handleToggleDebug, handleMockData, handleSimForward, handleSimRight, handleSimLeft, handleSimBackward, handleSimStop, handleReconnect, headStyle, label, manualControl, soundSrc, toggleManualMode, styler, ...rest}) => {
		const toggleButtons = [];

		for (const em in emotions) {
			const toggler = makeTogglerName(em);
			toggleButtons.push(<Button key={em} selected={expression[em]} onClick={rest[toggler]}>{emotions[em]}</Button>);

			delete rest[toggler];
		}

		delete rest.imageSrc;
		delete rest.onHideImage;

		return (
			<Layout orientation="vertical" {...rest}>
				<Cell shrink className={styler.join(css.controls, {manualControl})}>
					{toggleButtons}
					<ControllerIcon mode={controllerMode} onTap={handleControllerMode} />
					<ToggleButton onToggle={handleToggleDebug} selected={debug}>Debugging</ToggleButton>
				</Cell>
				<Cell className={css.headCanvas}>
					<div className={css.debugReadout}>{debugReadout}</div>
					<TappableHead expression={expression} className={css.head} onTap={toggleManualMode} style={headStyle} soundSrc={soundSrc} />
					<Transition className={css.messages} visible={active} type="slide" direction="left" duration={active ? 0 : 'medium'}>
						<BodyText centered className={css.label}>{label}</BodyText>
					</Transition>
					{/* <Transition className={css.vision} onHide={onHideImage} visible={active} type="slide" direction="down" duration={active ? 0 : 'long'}>
						<div className={css.imagePreview} style={{backgroundImage: imageSrc ? `url(${imageSrc})` : 'none'}} />
					</Transition> */}
				</Cell>
				<Cell shrink className={styler.join(css.adminConsole, {connected})}>
					<IconButton onTap={handleReconnect}>repeat</IconButton>
					<IconButton onTap={handleMockData}>repeatdownload</IconButton>
					<IconButton onTap={handleSimLeft}>arrowlargeleft</IconButton>
					<IconButton onTap={handleSimForward} style={{position: 'absolute', transform: 'translateY(-120%)'}}>arrowlargeup</IconButton>
					<IconButton onTap={handleSimBackward}>arrowlargedown</IconButton>
					<IconButton onTap={handleSimRight}>arrowlargeright</IconButton>
					<IconButton onTap={handleSimStop}>stop</IconButton>
				</Cell>
			</Layout>
		);
	}
});

const Brain = hoc((config, Wrapped) => {
	const cachedToggles = {};

	return class extends React.Component {
		static displayName = 'Brain'

		static propTypes = {
			activeTimeout: PropTypes.number,
			controllerMode: PropTypes.string,
			debugReadoutInterval: PropTypes.number,
			emotionalCertanty: PropTypes.number,
			host: PropTypes.string
		}

		static defaultProps = {
			activeTimeout: 3000,
			controllerMode: 'top',
			debugReadoutInterval: 500,
			emotionalCertanty: 3,
			host: ''
		}

		constructor (props) {
			super(props);

			// Store our current movement properties for standard referencing
			this.controls = {};
			this.movement = {};
			this.sensors = {};
			this.wheelData = {};
			this.debugReadoutInterval = props.debugReadoutInterval;
			this.debugReadout = null;
			this.emotionStreak = 0;
			this.previousEmotion = null;

			// Establish the base states
			this.state = {
				...this.resetStateOfAllEmotions(),
				connected: false,
				controllerMode: global.localStorage.getItem('controllerMode') || props.controllerMode,
				debugging: false,
				host: props.host,
				...this.setImageSrc(props)
			};
		}

		static getDerivedStateFromProps (nextProps, prevState) {
			if (nextProps.host !== prevState.host) {
				return {host: nextProps.host, ...this.setImageSrc()};
			}
			return null;
		}

		componentDidMount () {
			this.initializeBotConnection();
		}

		initializeBotConnection () {
			if (!this.bot) {
				console.log('Connecting to', this.props.host);
				this.bot = connect({
					url: 'ws://' + this.props.host,
					onConnection: () => {
						console.log('%cBrain attached', 'color: green');
						if (this.reconnectToBotLater) this.reconnectToBotLater.stop();
						this.setState({
							connected: true
						});
					},
					onClose: () => {
						console.log('%cBrain detached', 'color: red');

						this.initiateAutoReconnect();

						// Activate a reconnect button
						this.setState({
							connected: false
						});
					},
					onError: message => {
						console.error('Brain fart', message);

						this.initiateAutoReconnect();

						// Activate a reconnect button
						this.setState({
							connected: false
						});
					},
					onDetected: this.onDetected,
					onEmotions: this.onEmotions,
					onJoystick: this.onJoystick,
					onInfrared: this.onInfrared,
					onObstacle: this.onObstacle,
					onUltrasound: this.onUltrasound,
					onWheelsCmd: this.onWheelsCmd
				});
				this.debugReadout = setInterval(this.updateDebugReadout, this.debugReadoutInterval);
			}
		}

		initiateAutoReconnect = () => {
			if (this.reconnectToBotLater) this.reconnectToBotLater.stop();
			this.reconnectToBotLater = new Job(this.reconnectToBot, 1000);
			this.reconnectToBotLater.start();
		}

		//
		// Topic Handling Methods
		//

		onDetected = (message) => {
			console.log('%cSaw "%s" with %d\% certanty.', 'color: orange', message.label, parseInt(message.score * 100));
			if (this.jobDetected) {
				this.jobDetected.stop();
			}

			const [label] = message.label.split(','); // Just use the first tagged thing in the onscreen message, for simplicity

			const state = {
				active: true,
				label,
				activeImageSrc: this.state.imageSrc,
				...this.visionIntepretation(message.label)
			};
			this.setState(state);

			this.jobDetected = new Job(() => {
				this.setState({active: false});
			}, this.props.activeTimeout);
			this.jobDetected.start();
		}

		onEmotions = (message) => {
			// console.log(message.emotions[0].emotion);
			const label = message.emotions[0].emotion;
			console.log('%cSaw "%s".', 'color: orange', label);

			if (label === this.previousEmotion) {
				// Same same
				this.emotionStreak++;
			} else {
				// New emotion! Wow!
				this.previousEmotion = label;
				this.emotionStreak = 1;
			}

			// Only respond if we are pretty darn sure this is the way to go, and it's different from our current emotion
			if (this.emotionStreak >= this.props.emotionalCertanty && label !== this.state.label) {
				if (this.jobDetected) {
					this.jobDetected.stop();
				}

				const state = {
					active: true,
					label,
					activeImageSrc: this.state.imageSrc,
					...this.emotionIntepretation(label)
				};
				this.setState(state);

				this.jobDetected = new Job(() => {
					this.setState({active: false});
				}, this.props.activeTimeout);
				this.jobDetected.start();
			}
		}

		onJoystick = (data) => {
			const axes = {};
			for (const ax in data.axes) {
				const axisName = this.isAxis(ax);
				if (axisName) axes[axisName] = data.axes[ax];
			}

			const buttons = {};
			for (const bu in data.buttons) {
				const buttonName = this.isButton(bu);
				if (buttonName) buttons[buttonName] = !!data.buttons[bu];
			}

			this.controls.directional = axes;
			this.controls.actions = buttons;
		}

		onInfrared = (data) => {
			// console.log('onInfrared:', data.range, !!data.range);
			this.sensors.groundSafe = !!data.range;
		}

		onUltrasound = (data) => {
			// console.log('onUltrasound:', data.range);
			this.sensors.range = data.range;
		}

		onObstacle = (data) => {
			// console.log('onObstacle:', !!data);
			this.sensors.impassableAhead = !!data.data; // yeah, data.data is weird. It's just what the key is called...
		}

		onWheelsCmd = (data) => {
			// only run this if it's actually different from the last time we ran it.
			if (data.vel_left !== this.wheelData.vel_left || data.vel_right !== this.wheelData.vel_right) {
				const maxVel = 0.31417423486709595;
				let wheelLeft = data.vel_left || 0,
					wheelRight = data.vel_right || 0,
					velocity = 0,
					rotational = 0;

				wheelLeft = (wheelLeft / maxVel);
				wheelRight = (wheelRight / maxVel);
				velocity = (wheelLeft + wheelRight);
				// console.log('velocity:', velocity);

				this.movement.speed = 'IDLE';
				if (velocity > MOVEMENT.FULL)             {
					this.movement.speed = 'FULL'; this.movement.forward = true;
				} else if (velocity > MOVEMENT.HALF)        {
					this.movement.speed = 'HALF'; this.movement.forward = true;
				} else if (velocity > MOVEMENT.SLOW)        {
					this.movement.speed = 'SLOW'; this.movement.forward = true;
				} else if (velocity < (MOVEMENT.FULL * -1)) {
					this.movement.speed = 'FULL'; this.movement.forward = false;
				} else if (velocity < (MOVEMENT.HALF * -1)) {
					this.movement.speed = 'HALF'; this.movement.forward = false;
				} else if (velocity < (MOVEMENT.SLOW * -1)) {
					this.movement.speed = 'SLOW'; this.movement.forward = false;
				}

				// console.log('movement', this.movement.speed, 'velocity:', velocity, velocity > MOVEMENT.FULL, MOVEMENT.FULL);

				if (wheelLeft - wheelRight !== 0) rotational = (wheelLeft - wheelRight);

				if (this.node) {
					// left and right being +/- numbers means that adding them together determines our total velocity
					// negative is backward, positive is forward, 0 is totally neutral, stopped or rotating.
					this.node.style.setProperty('--face-wheel-velocity', velocity);

					this.node.style.setProperty('--face-wheel-velocity-left', wheelLeft);
					this.node.style.setProperty('--face-wheel-velocity-right', wheelRight);
					this.node.style.setProperty('--face-wheel-velocity-rotational', rotational);
				}

				// Audio nonsense
				if (this.jobSoundStart) {
					this.jobSoundStart.stop();
				}
				// console.log('Preparing Sound playback', velocity);

				this.jobSoundStart = new Job(() => {
					const {speed, forward} = this.movement;

					let src = '';
					if      (speed === 'SLOW' && forward) src = trollolol;
					else if (speed === 'FULL' && forward) src = birdtheword;
					else if (speed === 'SLOW' && !forward) src = sadtrombone;
					else if (speed === 'FULL' && !forward) src = birdtheword;

					console.log('%c%s %s', 'color: cyan', speed, forward ? 'AHEAD' : 'REVERSE');
					this.playSound({src, duration: 4000});

				}, 100);
				this.jobSoundStart.start();

				// update previously saved values for later comparison
				this.wheelData.vel_left = data.vel_left;
				this.wheelData.vel_right = data.vel_right;
			}
		}

		//
		// Audio Support
		//

		playSound = ({src, duration}) => {
			console.log(src ? ('Starting to play sound: ' + src) : 'Playing nothing', duration);
			if (this.jobSoundStop) {
				this.jobSoundStop.stop();
			}
			if (duration) {
				// If there is a duration, setup a stopper job
				this.jobSoundStop = new Job(this.stopSound, duration);
				this.jobSoundStop.start();
			}

			this.setState({soundSrc: src});
		}

		stopSound = () => {
			console.log('Restoring Silence');
			this.setState({soundSrc: ''});
		}

		//
		// Emotions and Expressions
		//

		toggleExpression = (emotion) => () => {
			const state = {};
			state[emotion] = !this.state[emotion];
			this.setState(state);
		}

		resetStateOfAllEmotions () {
			const state = {};
			for (const em in emotions) {
				cachedToggles[makeTogglerName(em)] = this.toggleExpression(em);
				state[em] = false;
			}
			return state;
		}

		interpretation (saw, mapping) {
			const state = this.resetStateOfAllEmotions();
			const addItemToState = item => (state[item] = true);
			const addResponseToState = ({emotion, sound}) => {
				if (emotion) emotion.forEach(addItemToState);
				if (sound) this.playSound(sound);
			};
			if (mapping[saw]) {
				// Exact matches first
				addResponseToState(mapping[saw]);
			} else {
				// Interpretative sub-matches
				console.groupCollapsed('Attempting to identify "' + saw + '".');
				for (const item in mapping) {
					if (saw.indexOf(item) > -1) {
						// Huzzah! Partial match.
						addResponseToState(mapping[item]);
						console.log('%cFound a match! "%s" is %s.', 'color: green', saw, item);
					} else {
						console.log('Doesn\'t look like', item);
					}
				}
				console.groupEnd();
			}
			return state;
		}

		emotionIntepretation (saw) {
			return this.interpretation(saw, perceivedEmotionMap);
		}

		visionIntepretation (saw) {
			return this.interpretation(saw, visionMap);
		}

		/**
		 * Expressions are outward displays of emotions. This consumes emotions and turns them into
		 * expressions.
		 *
		 * @return {Object} A new complete expression state object
		 */
		compileExpressions () {
			const exp = {};
			for (const em in emotions) {
				if (this.state[em]) exp[em] = this.state[em];
			}
			return exp;
		}

		//
		// Admin Console Functions
		//

		updateDebugReadout = () => {
			if (this.state.debugging) {
				const stringifyKeyVal = (key, val) => `${key}: ${val};\n`;
				let debugReadout = '';
				if (this.controls.directional) {
					let activeAuttons = [];
					for (const d in this.controls.directional) {
						if (this.controls.directional[d]) activeAuttons.push(`${d} = ${this.controls.directional[d]}`);
					}
					debugReadout += stringifyKeyVal('Directional', activeAuttons.join(', ') || 'none');
				}
				if (this.controls.actions) {
					let activeAuttons = [];
					for (const d in this.controls.actions) {
						if (this.controls.actions[d]) activeAuttons.push(d);
					}
					debugReadout += stringifyKeyVal('Actions', activeAuttons.join(', ') || 'none');
				}
				for (const d in this.movement) {
					debugReadout += stringifyKeyVal(d, this.movement[d]);
				}
				for (const d in this.sensors) {
					debugReadout += stringifyKeyVal(d, this.sensors[d]);
				}
				this.setState({debugReadout});
			}
		}

		reconnectToBot = () => {
			console.warn('%cAttempting to reconnect with the brain at:', 'color: orange', this.props.host);
			this.bot.ros.connect('ws://' + this.props.host);
		}

		/**
		 * Load in the global variable object `mock` to simule a new payload of data from the ROS backend.
		 */
		importMockData = () => {
			console.log('Importing Mock Data (window.mock):', global.mock);
			if (global.mock) {
				const {detected, wheels_cmd} = global.mock;
				if (detected) this.onDetected(detected);
				if (wheels_cmd) this.onWheelsCmd(wheels_cmd);
			}
		}
		simulateForward = () => {
			this.onWheelsCmd({vel_left: 0.31, vel_right: 0.31});
		}
		simulateRight = () => {
			this.onWheelsCmd({vel_left: -0.31, vel_right: 0.31});
		}
		simulateLeft = () => {
			this.onWheelsCmd({vel_left: 0.31, vel_right: -0.31});
		}
		simulateBackward = () => {
			this.onWheelsCmd({vel_left: -0.31, vel_right: -0.31});
		}
		simulateStop = () => {
			this.onWheelsCmd({vel_left: 0, vel_right: 0});
		}

		//
		// "Clever" Image Support
		// Facilitates only using the costly image when it's visible on screen.
		//

		/**
		 * Compute the image source based on the host name.
		 *
		 * @param {Object} props An optional props object
		 */
		setImageSrc (props) {
			// return null;
			const {host} = props || this.props;
			if (host) {
				const [hostname] = host.split(':');
				return {imageSrc: `http://${hostname}:8001/`};
			}
		}

		lingeringImageSrc = () => {
			// console.log('setting image state:', this);
			this.setState(({active, imageSrc}) => ({activeImageSrc: active ? imageSrc : null}));
		}

		// Controller configuration handler
		isAxis = (axis) => controlsMap[this.state.controllerMode].axis[axis] || null;
		isButton = (button) => controlsMap[this.state.controllerMode].buttons[button] || null;

		changeControllerMode = () => {
			const modes = ['top', 'left', 'bottom'];
			const newState = {};
			for (let i = 0; i < modes.length; i++) {
				if (this.state.controllerMode === modes[i]) {
					newState.controllerMode = modes[(i + 1) % modes.length];
					global.localStorage.setItem('controllerMode', newState.controllerMode);
				}
			}
			this.setState(newState);
		}

		toggleDebug = () => this.setState(({debugging}) => ({debugging: !debugging}));

		/**
		 * For direct node updates, css variables, specifically
		 */
		setRef = (node) => {
			// eslint-disable-next-line react/no-find-dom-node
			this.node = ReactDOM.findDOMNode(node);
		}

		render () {
			const {...rest} = this.props;
			delete rest.activeTimeout;
			delete rest.debugReadoutInterval;
			delete rest.host;

			return (
				<Wrapped
					{...rest}
					{...cachedToggles}
					ref={this.setRef}
					active={this.state.active}
					connected={this.state.connected}
					controllerMode={this.state.controllerMode}
					expression={this.compileExpressions()}
					handleControllerMode={this.changeControllerMode}
					handleMockData={this.importMockData}
					handleSimForward={this.simulateForward}
					handleSimRight={this.simulateRight}
					handleSimLeft={this.simulateLeft}
					handleSimBackward={this.simulateBackward}
					handleSimStop={this.simulateStop}
					handleReconnect={this.reconnectToBot}
					handleToggleDebug={this.toggleDebug}
					imageSrc={this.state.activeImageSrc}
					onHideImage={this.lingeringImageSrc}
					label={this.state.label}
					soundSrc={this.state.soundSrc}
					debug={this.state.debugging}
					debugReadout={this.state.debugReadout}
				/>
			);
		}
	};

});

export default
Makeup(
	Brain(
		Toggleable({
			toggleProp: 'toggleManualMode',
			prop: 'manualControl'
		},
		App
		)
	)
);

