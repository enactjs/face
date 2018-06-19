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
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import emotions from '../emotions';
import visionMap from '../visionMap';
import connect from '../data/bot';
import Head from '../views/Head';

// Assets
import birdtheword from '../../assets/sounds/birdtheword.mp3';
import sadtrombone from '../../assets/sounds/sadtrombone.mp3';
import trollolol from '../../assets/sounds/trollolol.mp3';

import css from './App.less';


// Movement speeds based on combined wheel velocity percentages 200% is both wheels full.
const MOVEMENT = {
	IDLE : 0,
	SLOW : 0.1,
	HALF : 1,
	FULL : 1.9
};

const makeTogglerName = (em) => 'toggle' + toCapitalized(em);

// Normalize visionMap
// Convert to the final, more elaborate, format so we don't have to check later on
for (const item in visionMap) {
	if (typeof visionMap[item] === 'string' || Array.isArray(visionMap[item])) {
		// Reassign to be an object and finish normalizing these two types later...
		visionMap[item] = {
			emotion: visionMap[item]
		};
	}

	// Now that we know it's an object, let's normalize thees keys
	if (visionMap[item].emotion && typeof visionMap[item].emotion === 'string') {
		visionMap[item].emotion = [visionMap[item].emotion];
	}
	// Sound key can be either a string or an object. If it's an object, use it
	// directly, otherwise build a basic object and use that.
	if (visionMap[item].sound && typeof visionMap[item].sound === 'string') {
		visionMap[item].sound = {src: visionMap[item].sound};
	}
}

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
		handleMockData: PropTypes.func,
		handleSimForward: PropTypes.func,
		handleSimRight: PropTypes.func,
		handleSimLeft: PropTypes.func,
		handleSimBackward: PropTypes.func,
		handleSimStop: PropTypes.func,
		handleReconnect: PropTypes.func,
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

	render: ({expression, active, connected, debugReadout, handleMockData, handleSimForward, handleSimRight, handleSimLeft, handleSimBackward, handleSimStop, handleReconnect, headStyle, imageSrc, label, manualControl, onHideImage, soundSrc, toggleManualMode, styler, ...rest}) => {
		const toggleButtons = [];

		for (const em in emotions) {
			const toggler = makeTogglerName(em);
			toggleButtons.push(<Button key={em} small selected={expression[em]} onClick={rest[toggler]}>{emotions[em]}</Button>);

			delete rest[toggler];
		}

		return (
			<Layout orientation="vertical" {...rest}>
				<Cell shrink className={styler.join(css.controls, {manualControl})}>
					{toggleButtons}
				</Cell>
				<Cell className={css.headCanvas}>
					<div className={css.debugReadout}>{debugReadout}</div>
					<TappableHead expression={expression} className={css.head} onTap={toggleManualMode} style={headStyle} soundSrc={soundSrc} />
					<Transition className={css.messages} visible={active} type="slide" direction="left" duration={active ? 0 : 'medium'}>
						<BodyText centered className={css.label}>{label}</BodyText>
					</Transition>
					<Transition className={css.vision} onHide={onHideImage} visible={active} type="slide" direction="down" duration={active ? 0 : 'long'}>
						<div className={css.imagePreview} style={{backgroundImage: imageSrc ? `url(${imageSrc})` : 'none'}} />
					</Transition>
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
			host: PropTypes.string,
			activeTimeout: PropTypes.number,
			debugReadoutInterval: PropTypes.number
		}

		static defaultProps = {
			host: '',
			activeTimeout: 3000,
			debugReadoutInterval: 1000
		}

		constructor (props) {
			super(props);

			// Store our current movement properties for standard referencing
			this.movement = {};
			this.sensors = {};
			this.debugReadoutInterval = props.debugReadoutInterval;
			this.debugReadout = null;

			// Establish the base states
			this.state = this.resetStateOfAllEmotions();
			this.state.connected = false;

			const imageState = this.setImageSrc(props);

			// Shallow state merge in new state values
			this.state = {...this.state, ...imageState};
		}

		componentDidMount () {
			this.initializeBotConnection();
		}

		initializeBotConnection () {
			if (!this.bot) {
				console.log('Attempting Connection to', this.props.host);
				this.wheelData = {};  // Setup a place to store data from our connection
				this.bot = connect({
					url: 'ws://' + this.props.host,
					onConnection: () => {
						console.log('%cBrain attached', 'color: green');
						this.setState({
							connected: true
						});
					},
					onClose: () => {
						console.log('%cBrain detached', 'color: red');
						// Activate a reconnect button
						this.setState({
							connected: false
						});
					},
					onDetected: this.onDetected,
					onInfrared: this.onInfrared,
					onObstacle: this.onObstacle,
					onUltrasound: this.onUltrasound,
					onWheelsCmd: this.onWheelsCmd
					// onError: message => {
					// 	console.log(`Brain fart`, message);
					// 	// Activate a reconnect button
					// 	this.setState({
					// 		connected: false
					// 	});
					// }
				});
				this.debugReadout = setInterval(this.updateDebugReadout, this.debugReadoutInterval);
			}
		}

		updateDebugReadout = () => {
			const stringifyKeyVal = (key, val) => `${key}: ${val};\n`;
			let debugReadout = '';
			for (const d in this.movement) {
				debugReadout+= stringifyKeyVal(d, this.movement[d]);
			}
			for (const d in this.sensors) {
				debugReadout+= stringifyKeyVal(d, this.sensors[d]);
			}
			this.setState({debugReadout});
		}

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
				if (velocity > MOVEMENT.FULL)             { this.movement.speed = 'FULL'; this.movement.forward = true; }
				else if (velocity > MOVEMENT.HALF)        { this.movement.speed = 'HALF'; this.movement.forward = true; }
				else if (velocity > MOVEMENT.SLOW)        { this.movement.speed = 'SLOW'; this.movement.forward = true; }
				else if (velocity < (MOVEMENT.FULL * -1)) { this.movement.speed = 'FULL'; this.movement.forward = false; }
				else if (velocity < (MOVEMENT.HALF * -1)) { this.movement.speed = 'HALF'; this.movement.forward = false; }
				else if (velocity < (MOVEMENT.SLOW * -1)) { this.movement.speed = 'SLOW'; this.movement.forward = false; }

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

		playSound = ({src, duration}) => {
			// console.log(src ? ('Starting to play sound: ' + src) : 'Playing nothing', duration);
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

		visionIntepretation (saw) {
			const state = this.resetStateOfAllEmotions();
			const addItemToState = item => (state[item] = true);
			const addResponseToState = ({emotion, sound}) => {
				if (emotion) emotion.forEach(addItemToState);
				if (sound) this.playSound(sound);
			};

			if (visionMap[saw]) {
				// Exact matches first
				addResponseToState(visionMap[saw]);
			} else {
				// Interpretative sub-matches
				console.groupCollapsed('Attempting to identify "' + saw + '".');
				for (const item in visionMap) {
					if (saw.indexOf(item) > -1) {
						// Huzzah! Partial match.
						addResponseToState(visionMap[item]);
						console.log('%cFound a match! "%s" is a %s.', 'color: green', saw, item);
					} else {
						console.log('Doesn\'t look like it\'s a', item);
					}
				}
				console.groupEnd();
			}

			return state;
		}

		//
		// Admin Console Functions
		//

		reconnectToBot = () => {
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

		componentWillReceiveProps (nextProps) {
			if (nextProps.host !== this.props.host) {
				this.setState(this.setImageSrc());
			}
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
			this.setState({
				activeImageSrc: this.state.active ? this.state.imageSrc : null
			})
		}

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
					expression={this.compileExpressions()}
					handleMockData={this.importMockData}
					handleSimForward={this.simulateForward}
					handleSimRight={this.simulateRight}
					handleSimLeft={this.simulateLeft}
					handleSimBackward={this.simulateBackward}
					handleSimStop={this.simulateStop}
					handleReconnect={this.reconnectToBot}
					imageSrc={this.state.activeImageSrc}
					onHideImage={this.lingeringImageSrc}
					label={this.state.label}
					soundSrc={this.state.soundSrc}
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

