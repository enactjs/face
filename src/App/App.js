import kind from '@enact/core/kind';
import hoc from '@enact/core/hoc';
import {toCapitalized} from '@enact/i18n/util';
import {Layout, Cell} from '@enact/ui/Layout';
import Skinnable from '@enact/moonstone/Skinnable';
// import MoonstoneDecorator from '@enact/moonstone/MoonstoneDecorator';
import ToggleButton from '@enact/moonstone/ToggleButton';
import PropTypes from 'prop-types';
import React from 'react';

import emotions from '../emotions';
import Head from '../views/Head';

import css from './App.less';

const makeTogglerName = (em) => 'toggle' + toCapitalized(em)

const togglePropTypes = {};
for (const em in emotions) {
	togglePropTypes[makeTogglerName(em)] = PropTypes.func;
}

// const MoonstoneControlsPanel = MoonstoneDecorator({float: true}, 'div');
const MoonstoneControlsPanel = Skinnable({defaultSkin: 'dark'}, Cell);

const App = kind({
	name: 'App',

	propTypes: {
		...togglePropTypes
	},

	styles: {
		css,
		className: 'app'
	},

	render: ({expression, ...rest}) => {
		const toggleButtons = [];
		for (const em in emotions) {
			const toggler = makeTogglerName(em);
			toggleButtons.push(<ToggleButton key={em} onClick={rest[toggler]}>{emotions[em]}</ToggleButton>);

			delete rest[toggler];
		}
		return (
			<Layout orientation="vertical" {...rest}>
				<Cell shrink>
				<MoonstoneControlsPanel className={css.controls}>
					{toggleButtons}
				</MoonstoneControlsPanel>
				</Cell>
				<Cell>
					<Head expression={expression} />
				</Cell>
			</Layout>
		);
	}
});

const Brain = hoc((config, Wrapped) => {
	const cachedToggles = {};

	return class extends React.Component {
		static displayName = 'Brain'

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
			return (
				<Wrapped
					{...this.props}
					{...cachedToggles}
					expression={this.compileExpressions()}
				/>
			);
		}
	};

});

export default Brain(App);
