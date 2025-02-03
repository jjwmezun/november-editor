import propTypes from 'prop-types';

const GraphicsMode = props => {
	const { exitMode } = props;
	return <div>
		<h1>Graphics Editor</h1>
		<div>
			<button onClick={ exitMode }>← Back</button>
		</div>
	</div>;
};

GraphicsMode.propTypes = {
	exitMode: propTypes.func.isRequired,
};

export default GraphicsMode;
