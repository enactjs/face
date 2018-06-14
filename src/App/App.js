import kind from '@enact/core/kind';
import hoc from '@enact/core/hoc';
import {Job} from '@enact/core/util';
import {toCapitalized} from '@enact/i18n/util';
import {Layout, Cell} from '@enact/ui/Layout';
import Toggleable from '@enact/ui/Toggleable';
import Touchable from '@enact/ui/Touchable';
import Transition from '@enact/ui/Transition';
import ForwardRef from '@enact/ui/ForwardRef';
import BodyText from '@enact/moonstone/BodyText';
import IconButton from '@enact/moonstone/IconButton';
import Skinnable from '@enact/moonstone/Skinnable';
import SpotlightRootDecorator from '@enact/spotlight/SpotlightRootDecorator';
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
const MoonstoneControlsPanel = SpotlightRootDecorator(
	Skinnable({defaultSkin: 'dark'},
		Cell
	)
);

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

	// computed: {
	// 	headStyle: ({wheelRight}) => ({
	// 		transform: `rotate(${wheelRight * 15}deg)`
	// 	})
	// },

	render: ({expression, active, connected, handleReconnect, headStyle, imageSrc, label, manualControl, toggleManualMode, styler, ...rest}) => {
		const toggleButtons = [];
		// console.log('expression:', expression);
		for (const em in emotions) {
			const toggler = makeTogglerName(em);
			toggleButtons.push(<Button key={em} small selected={expression[em]} onClick={rest[toggler]}>{emotions[em]}</Button>);

			delete rest[toggler];
		}
		delete rest.wheelLeft;
		delete rest.wheelRight;
						// <img src={imageSrc} className={css.image} />
		return (
			<Layout orientation="vertical" {...rest}>
				<MoonstoneControlsPanel shrink className={styler.join(css.controls, {manualControl})}>
					{toggleButtons}
				</MoonstoneControlsPanel>
				<Cell className={css.headCanvas}>
					<TappableHead expression={expression} className={css.head} onTap={toggleManualMode} style={headStyle}/>
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

						// this.setState({wheelLeft, wheelRight});

						if (this.node) {
							// console.log('this.node:', this.node);
							this.node.style.setProperty('--face-wheel-velocity-left', wheelLeft);
							this.node.style.setProperty('--face-wheel-velocity-right', wheelRight);
						}

						// if (data.vel_left > 0) {

						// }
						// data.vel_right;
						// data.vel_left;
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
			// this.node = node;
			this.node = ReactDOM.findDOMNode(node);
			// console.log('successfully set the ref:', this.node);
		}

		// setRootElem ({setRootElem} = this.props) {
		// 	if (setRootElem) {
		// 		setRootElem(this.video);
		// 		this.node = node;
		// 	}
		// }

		render () {
			const {host, setRef, ...rest} = this.props;
			const [hostname] = host.split(':');
			delete rest.activeTimeout;
			delete rest.host;

			// const ref = React.createRef();
			return (
				<Wrapped
					{...rest}
					{...cachedToggles}
					//ref={ref}
					ref={this.setRef}
					active={this.state.active}
					connected={this.state.connected}
					expression={this.compileExpressions()}
					handleReconnect={this.reconnectToBot}
					imageSrc={`http://${hostname}:8001/`}
					label={this.state.label}
					wheelLeft={this.state.wheelLeft}
					wheelRight={this.state.wheelRight}
				/>
			);
		}
	};

});

export default
		// ForwardRef({prop: 'setRef'},
	Brain(
		Toggleable({
			toggleProp: 'toggleManualMode',
			prop: 'manualControl'
			// toggle: 'toggleManualMode'
		},
			// Touchable(
				App
			)
		// )
	);

