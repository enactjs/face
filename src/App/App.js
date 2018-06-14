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
// import Skinnable from '@enact/moonstone/Skinnable';
// import SpotlightRootDecorator from '@enact/spotlight/SpotlightRootDecorator';
import Makeup from '../components/Makeup';
// import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator';
import Button from '@enact/moonstone/Button';
// import ToggleButton from '@enact/moonstone/ToggleButton';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

import emotions from '../emotions';
import visionMap from '../visionMap';
import connect from '../data/bot';
import Head from '../views/Head';

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

// const MoonstoneControlsPanel = MoonstoneDecorator({float: true}, 'div');
// const ToggleableHead = Toggleable({toggleProp: 'onTap', prop: 'manualControl'}, Touchable(Head));
const TappableHead = Touchable(Head);
// const MoonstoneControlsPanel = SpotlightRootDecorator(
// 	Skinnable({defaultSkin: 'dark'},
// 		Cell
// 	)
// );

const MoonstoneControlsPanel = Cell;

const App = kind({
	name: 'App',

	propTypes: {
		...togglePropTypes,
		active: PropTypes.bool,
		connected: PropTypes.bool,
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

	render: ({expression, active, connected, handleReconnect, headStyle, imageSrc, label, manualControl, soundSrc, toggleManualMode, styler, ...rest}) => {
		const toggleButtons = [];

		for (const em in emotions) {
			const toggler = makeTogglerName(em);
			toggleButtons.push(<Button key={em} small selected={expression[em]} onClick={rest[toggler]}>{emotions[em]}</Button>);

			delete rest[toggler];
		}

		return (
			<Layout orientation="vertical" {...rest}>
				<MoonstoneControlsPanel shrink className={styler.join(css.controls, {manualControl})}>
					{toggleButtons}
				</MoonstoneControlsPanel>
				<Cell className={css.headCanvas}>
					<TappableHead expression={expression} className={css.head} onTap={toggleManualMode} style={headStyle} soundSrc={soundSrc} />
					<Transition className={css.messages} visible={active} type="slide" direction="down" duration={active ? 0 : 'long'}>
						<div className={css.imagePreview} style={{backgroundImage: `url(${imageSrc})`}} />
						<BodyText centered className={css.label}>{label}</BodyText>
					</Transition>
				</Cell>
				<MoonstoneControlsPanel shrink className={styler.join(css.adminConsole, {connected})}>
					<IconButton onTap={handleReconnect}>repeat</IconButton>
				</MoonstoneControlsPanel>
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
					onDetected: message => {
						console.log('%cSaw "%s" with %d\% certanty.', 'color: orange', message.label, parseInt(message.score * 100));
						if (this.job) {
							this.job.stop();
						}

						const state = {
							active: true,
							label: message.label,
							...this.visionIntepretation(message.label)
						};
						this.setState(state);

						this.job = new Job(() => {
							this.setState({active: false});
						}, this.props.activeTimeout);
						this.job.start();
					},
					onWheelsCmd: data => {
						const maxVel = 0.31417423486709595;
						let wheelLeft = data.vel_left || 0,
							wheelRight = data.vel_right || 0;

						wheelLeft = (wheelLeft / maxVel);
						wheelRight = (wheelRight / maxVel);

						if (this.node) {
							// left and right being +/- numbers means that adding them together determines our total velocity
							// negative is backward, positive is forward, 0 is totally neutral, stopped or rotating.
							this.node.style.setProperty('--face-wheel-velocity', (wheelLeft + wheelRight));

							this.node.style.setProperty('--face-wheel-velocity-left', wheelLeft);
							this.node.style.setProperty('--face-wheel-velocity-right', wheelRight);
						}
					},
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

		reconnectToBot = () => {
			this.bot.ros.connect('ws://' + this.props.host);
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
					handleReconnect={this.reconnectToBot}
					imageSrc={`http://${hostname}:8001/`}
					label={this.state.label}
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

