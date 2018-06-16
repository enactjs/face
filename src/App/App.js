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
// import birdtheword from '../../assets/sounds/birdtheword.mp3';
import sadtrombone from '../../assets/sounds/sadtrombone.mp3';
import trollolol from '../../assets/sounds/trollolol.mp3';

import css from './App.less';

// Normalize visionMap
// Convert any plain strings to small arrays.
for (const item in visionMap) {
	if (typeof visionMap[item] === 'string') {
		visionMap[item] = [visionMap[item]];
	}
}


const makeTogglerName = (em) => 'toggle' + toCapitalized(em);

const togglePropTypes = {};
for (const em in emotions) {
	togglePropTypes[makeTogglerName(em)] = PropTypes.func;
}



//
// add yawn
// add wink
//
// tie sounds to visions
//
//
//
//
//



const TappableHead = Touchable(Head);

const App = kind({
	name: 'App',

	propTypes: {
		...togglePropTypes,
		active: PropTypes.bool,
		connected: PropTypes.bool,
		handleMockData: PropTypes.func,
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

	render: ({expression, active, connected, handleMockData, handleSimForward, handleSimRight, handleSimLeft, handleSimBackward, handleSimStop, handleReconnect, headStyle, imageSrc, label, manualControl, soundSrc, toggleManualMode, styler, ...rest}) => {
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
					<TappableHead expression={expression} className={css.head} onTap={toggleManualMode} style={headStyle} soundSrc={soundSrc} />
					<Transition className={css.messages} visible={active} type="slide" direction="left" duration={active ? 0 : 'medium'}>
						<BodyText centered className={css.label}>{label}</BodyText>
					</Transition>
					<Transition className={css.vision} visible={active} type="slide" direction="down" duration={active ? 0 : 'long'}>
						<div className={css.imagePreview} style={{backgroundImage: (active ? `url(${imageSrc})` : 'none')}} />
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
			activeTimeout: PropTypes.number
		}

		static defaultProps = {
			host: '',
			activeTimeout: 3000
		}

		constructor () {
			super();

			// Establish the base states
			this.state = this.resetStateOfAllEmotions();
			this.state.connected = false;
		}

		componentDidMount () {
			this.initializeBotConnection();
		}

		initializeBotConnection () {
			if (!this.bot) {
				console.log('Attempting Connection to', this.props.host);
				this.bot = connect({
					url: 'ws://' + this.props.host,
					onConnection: () => {
						console.log('%cBrain attached', 'color: green');
						this.setState({
							connected: true
						});
					},
					onDetected: this.onDetected,
					onWheelsCmd: this.onWheelsCmd,
					onClose: () => {
						console.log('%cBrain detached', 'color: red');
						// Activate a reconnect button
						this.setState({
							connected: false
						});
					}
					// onError: message => {
					// 	console.log(`Brain fart`, message);
					// 	// Activate a reconnect button
					// 	this.setState({
					// 		connected: false
					// 	});
					// }
				});
			}
		}

		onDetected = (message) => {
			console.log('%cSaw "%s" with %d\% certanty.', 'color: orange', message.label, parseInt(message.score * 100));
			if (this.jobDetected) {
				this.jobDetected.stop();
			}

			const state = {
				active: true,
				label: message.label,
				...this.visionIntepretation(message.label)
			};
			this.setState(state);

			this.jobDetected = new Job(() => {
				this.setState({active: false});
			}, this.props.activeTimeout);
			this.jobDetected.start();
		}

		onWheelsCmd = (data) => {

			const maxVel = 0.31417423486709595;
			let wheelLeft = data.vel_left || 0,
				wheelRight = data.vel_right || 0,
				velocity = 0,
				rotational = 0;

			wheelLeft = (wheelLeft / maxVel);
			wheelRight = (wheelRight / maxVel);
			velocity = (wheelLeft + wheelRight);
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
			this.jobSoundStart = new Job(() => {
				let sound = '';
				// if (velocity > 1) sound = birdtheword;
				// else if (velocity > 0) sound = trollolol;
				if (velocity > 0) sound = trollolol;
				else if (velocity < 0) sound = sadtrombone;

				this.playSound({sound, duration: 4000});

			}, 200);
			this.jobSoundStart.start();
		}

		playSound ({sound, duration}) {
			console.log('Starting to play sound:', sound);
			if (this.jobSoundStop) {
				this.jobSoundStop.stop();
			}
			if (duration) {
				// If there is a duration, setup a stopper job
				this.jobSoundStop = new Job(() => this.stopSound, duration);
				this.jobSoundStop.start();
			}

			this.setState({soundSrc: sound});
		}

		stopSound () {
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

			if (visionMap[saw]) {
				// Exact matches first
				visionMap[saw].forEach(addItemToState);
			} else {
				// Interpretative sub-matches
				console.groupCollapsed('Attempting to identify "' + saw + '".');
				for (const item in visionMap) {
					if (saw.indexOf(item) > -1) {
						// Huzzah! Partial match.
						visionMap[item].forEach(addItemToState);
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

		setRef = (node) => {
			// eslint-disable-next-line react/no-find-dom-node
			this.node = ReactDOM.findDOMNode(node);
		}

		render () {
			const {host, ...rest} = this.props;
			const [hostname] = host.split(':');
			delete rest.activeTimeout;
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
					imageSrc={`http://${hostname}:8001/`}
					label={this.state.label}
					soundSrc={this.state.soundSrc}
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

