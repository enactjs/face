import kind from '@enact/core/kind';
import hoc from '@enact/core/hoc';
import {Job} from '@enact/core/util';
import {toCapitalized} from '@enact/i18n/util';
import {Layout, Cell} from '@enact/ui/Layout';
import Transition from '@enact/ui/Transition';
import BodyText from '@enact/moonstone/BodyText';
import Skinnable from '@enact/moonstone/Skinnable';
// import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator';
import ToggleButton from '@enact/moonstone/ToggleButton';
import PropTypes from 'prop-types';
import React from 'react';

import emotions from '../emotions';
import connect from '../data/bot';
import Head from '../views/Head';

import css from './App.less';

const makeTogglerName = (em) => 'toggle' + toCapitalized(em);

const togglePropTypes = {};
for (const em in emotions) {
	togglePropTypes[makeTogglerName(em)] = PropTypes.func;
}

// const MoonstoneControlsPanel = MoonstoneDecorator({float: true}, 'div');
const MoonstoneControlsPanel = Skinnable({defaultSkin: 'dark'}, Cell);

const App = kind({
	name: 'App',

	propTypes: {
		...togglePropTypes,
		active: PropTypes.bool,
		label: PropTypes.string
	},

	defaultProps: {
		label: '<N/A>',
		active: false
	},

	styles: {
		css,
		className: 'app'
	},

	render: ({expression, active, label, ...rest}) => {
		const toggleButtons = [];
		for (const em in emotions) {
			const toggler = makeTogglerName(em);
			toggleButtons.push(<ToggleButton key={em} onClick={rest[toggler]}>{emotions[em]}</ToggleButton>);

			delete rest[toggler];
		}
		return (
			<Layout orientation="vertical" {...rest}>
				<MoonstoneControlsPanel className={css.controls} shrink>
					{toggleButtons}
				</MoonstoneControlsPanel>
				<Cell>
					<Head expression={expression} />
				</Cell>
				<MoonstoneControlsPanel shrink className={css.label}>
					<Transition visible={active} type="fade" duration={active ? 0 : 'long'}>
						<BodyText centered>{label}</BodyText>
					</Transition>
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
			const state = {};
			for (const em in emotions) {
				cachedToggles[makeTogglerName(em)] = this.toggleExpression(em);
				state[em] = false;
			}

			this.state = state;
		}

		componentDidMount () {
			if (!this.bot) {
				console.log('connect attempt ' + this.props.host)
				this.bot = connect({
					url: 'ws://' + this.props.host,
					onMessage: message => {
						if (this.job) {
							this.job.stop();
						}
						this.setState({
							label: message.label,
							active: true
						});
						this.job = new Job(() => {
							this.setState({active: false});
						}, 3000);
						this.job.start();
					}
				});
			}
		}

		toggleExpression = (emotion) => () => {
			const state = {};
			state[emotion] = !this.state[emotion];
			this.setState(state);
		}

		compileExpressions () {
			const exp = {};
			for (const em in emotions) {
				if (this.state[em]) exp[em] = this.state[em];
			}
			return exp;
		}

		render () {
			const {...rest} = this.props;
			delete rest.activeTimeout;
			delete rest.host;

			return (
				<Wrapped
					{...rest}
					{...cachedToggles}
					expression={this.compileExpressions()}
					label={this.state.label}
					active={this.state.active}
				/>
			);
		}
	};

});

export default Brain(App);
