import '../assets/editor.scss';
import React, { useEffect, useRef, useState } from 'react';
import urban from '../assets/urban.png';

const createTileRenderer = ( ctx, tileset ) => args => {
    const {
        srcx,
        srcy,
        x,
        y,
        w,
        h,
    } = {
        srcx: 0,
        srcy: 0,
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        ...args,
    };
    ctx.drawImage( tileset, srcx * 8, srcy * 8, w * 8, h * 8, x * 8, y * 8, w * 8, h * 8 );
};

const createObject = object => ({
    xTiles: function() {
        return this.x * 2;
    },
    widthTiles: function() {
        return this.width * 2;
    },
    rightTiles: function() {
        return ( this.x + this.width ) * 2;
    },
    yTiles: function() {
        return this.y * 2;
    },
    heightTiles: function() {
        return this.height * 2;
    },
    bottomTiles: function() {
        return ( this.y + this.height ) * 2;
    },
    ...object,
});

const types = Object.freeze([
    {
        name: `Ground`,
        create: ( x, y ) => ({
            x: x,
            y: y,
            width: 1,
            height: 1,
        }),
        render: ( tileRenderer, object ) => {
            // Render sidewalk top.
            for ( let x = object.xTiles(); x < object.rightTiles(); x += 2 ) {
                tileRenderer({
                    x,
                    y: object.yTiles(),
                    w: 2
                });
                tileRenderer({
                    srcx: 2,
                    x,
                    y: object.yTiles() + 1
                });
                tileRenderer({
                    srcx: 2,
                    x: x + 1,
                    y: object.yTiles() + 1
                });
            }

            // Render dirt center.
            for ( let y = object.yTiles() + 2; y < object.bottomTiles(); y++ ) {
                for ( let x = object.xTiles(); x < object.rightTiles(); x++ ) {
                    tileRenderer({
                        srcx: 3,
                        x,
                        y
                    });
                }
            }
        },
        exportData: [
            { type: `Uint16`, data: `x`, },
            { type: `Uint16`, data: `y`, },
            { type: `Uint16`, data: `width`, },
            { type: `Uint8`, data: `height`, },
        ],
        options: [
            {
                title: `X`,
                key: `x`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Y`,
                key: `y`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Width`,
                key: `width`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 1,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Height`,
                key: `height`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 1,
                    max: Math.pow( 2, 8 ) - 1,
                },
            },
        ],
    },
    {
        name: `Fire Hydrant`,
        create: ( x, y ) => ({
            x: x,
            y: y,
        }),
        render: ( tileRenderer, object ) => {
            tileRenderer({
                srcx: 13,
                x: object.xTiles(),
                y: object.yTiles(),
                w: 2,
            });
            tileRenderer({
                srcx: 15,
                x: object.xTiles(),
                y: object.yTiles() + 1,
                w: 2,
            });
        },
        exportData: [
            { type: `Uint16`, data: `x`, },
            { type: `Uint16`, data: `y`, },
        ],
        options: [
            {
                title: `X`,
                key: `x`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Y`,
                key: `y`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
        ],
    },
    {
        name: `Gem`,
        create: ( x, y ) => ({
            x: x,
            y: y,
            width: 1,
            height: 1,
        }),
        render: ( tileRenderer, object, frame ) => {
            const animationOffset = 2 * ( frame % 6 );
            for ( let y = object.yTiles(); y < object.bottomTiles(); y += 2 ) {
                for ( let x = object.xTiles(); x < object.rightTiles(); x += 2 ) {
                    tileRenderer({
                        srcx: 67 + animationOffset,
                        x,
                        y,
                        w: 2,
                    });
                    tileRenderer({
                        srcx: 79 + animationOffset,
                        x,
                        y: y + 1,
                        w: 2,
                    });
                }
            }
        },
        exportData: [
            { type: `Uint16`, data: `x`, },
            { type: `Uint16`, data: `y`, },
            { type: `Uint8`, data: `width`, },
            { type: `Uint8`, data: `height`, },
        ],
        options: [
            {
                title: `X`,
                key: `x`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Y`,
                key: `y`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Width`,
                key: `width`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 1,
                    max: Math.pow( 2, 8 ) - 1,
                },
            },
            {
                title: `Height`,
                key: `height`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 1,
                    max: Math.pow( 2, 8 ) - 1,
                },
            },
        ],
    },
    {
        name: `Building`,
        create: ( x, y ) => ({
            x: x,
            y: y,
            width: 6,
            height: 3,
            door: 2,
        }),
        render: ( tileRenderer, object ) => {
            const ystart = object.yTiles();
            const xstart = object.xTiles();
            const yend = object.bottomTiles() - 1;
            const xend = object.rightTiles() - 1;

            // Render top-left corner.
            tileRenderer({
                srcx: 22,
                x: xstart,
                y: ystart,
            });

            // Render top-right corner.
            tileRenderer({
                srcx: 23,
                x: xend,
                y: ystart,
            });

            // Render bottom-left corner.
            tileRenderer({
                srcx: 24,
                x: xstart,
                y: yend,
            });

            // Render bottom-right corner.
            tileRenderer({
                srcx: 25,
                x: xend,
                y: yend,
            });

            // Render top & bottom tiles.
            for ( let x = xstart + 1; x < xend; x++ ) {
                tileRenderer({
                    srcx: 18,
                    x: x,
                    y: ystart,
                });
                tileRenderer({
                    srcx: 19,
                    x: x,
                    y: yend,
                });
            }

            // Render left & right tiles.
            for ( let y = ystart + 1; y < yend; y++ ) {
                tileRenderer({
                    srcx: 20,
                    x: xstart,
                    y: y,
                });
                tileRenderer({
                    srcx: 21,
                    x: xend,
                    y: y,
                });
            }

            // Render center tiles.
            for ( let y = ystart + 1; y < yend; y++ ) {
                for ( let x = xstart + 1; x < xend; x++ ) {
                    tileRenderer({
                        srcx: 17,
                        x: x,
                        y: y,
                    });
                }
            }

            // Render door.
            for ( let i = 3; i >= 0; i-- ) {
                tileRenderer({
                    srcx: 47 - i * 2,
                    x: xstart + object.door * 2,
                    y: yend - i,
                    w: 2,
                });
            }
        },
        exportData: [
            { type: `Uint16`, data: `x`, },
            { type: `Uint16`, data: `y`, },
            { type: `Uint8`, data: `width`, },
            { type: `Uint8`, data: `height`, },
            { type: `Uint8`, data: `door`, },
        ],
        options: [
            {
                title: `X`,
                key: `x`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Y`,
                key: `y`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 0,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
            {
                title: `Width`,
                key: `width`,
                type: `number`,
                update: v => parseInt( v ),
                extraUpdate: ( object, v ) => {
                    const door = object.door;
                    if ( door >= v - 1 ) {
                        return { door: v - 2 };
                    }
                    return {};
                },
                atts: {
                    min: 3,
                    max: Math.pow( 2, 8 ) - 1,
                },
            },
            {
                title: `Height`,
                key: `height`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 3,
                    max: Math.pow( 2, 8 ) - 1,
                },
            },
            {
                title: `Door`,
                key: `door`,
                type: `number`,
                update: v => parseInt( v ),
                atts: {
                    min: 1,
                    max: object => object.width - 2,
                }
            },
        ],
    },
]);

const getDataTypeSize = type => type === `Uint16` ? 2 : 1;

const getMousePosition = e => ({
    x: e.clientX - e.target.offsetLeft,
    y: e.clientY - e.target.offsetTop,
});

const Canvas = props => {
    const { height, objects, update, width } = props;

    const canvasRef = useRef();
    const [ gridImage, setGridImage ] = useState( null );
    const [ selected, setSelected ] = useState( { x: null, y: null } );
    const [ selectedObject, setSelectedObject ] = useState( null );
    const [ tileset, setTileset ] = useState( null );
    const [ selectedType, setSelectedType ] = useState( 0 );
    const [ frame, setFrame ] = useState( 0 );

    useEffect(() => {
        if ( objects.length === 0 ) {
            setSelected( { x: null, y: null } );
            setSelectedObject( null );
            setSelectedType( 0 );
        }
    }, [ objects ]);

    const setWidth = width => update( `Width`, width );
    const setHeight = height => update( `Height`, height );
    const setObjects = objects => update( `Objects`, objects );

    const addObject = o => {
        setObjects( objects => {
            return [ ...objects, createObject( o ) ];
        });
    };

    const updateObject = ( index, o ) => {
        setObjects( objects => {
            const newObjects = [ ...objects ];
            newObjects[ index ] = { ...newObjects[ index ], ...o };
            return newObjects;
        });
    };

    // Select object on left click.
    const onClick = e => {
        const { x, y } = getMousePosition( e );

        const gridX = Math.floor( x / 16 );
        const gridY = Math.floor( y / 16 );

        let newSelectedObject = null;
        // Go backwards so that the topmost object is selected first.
        for ( let i = objects.length - 1; i >= 0; i-- ) {
            const object = objects[ i ];
            if ( gridX >= object.x && gridX <= object.x + ( object.width ?? 1 ) && gridY >= object.y && gridY <= object.y + ( object.height ?? 1 ) ) {
                newSelectedObject = i;
                break;
            }
        }
        setSelectedObject( newSelectedObject );
    };

    // Create object on right click.
    const onRightClick = e => {
        const { x, y } = getMousePosition( e );

        const gridX = Math.floor( x / 16 );
        const gridY = Math.floor( y / 16 );

        addObject( { ...types[ selectedType ].create( gridX, gridY ), type: selectedType } );

        e.preventDefault();
    };

    // Update cursor visuals on mouse move.
    const onMouseMove = e => {
        const { x, y } = getMousePosition( e );

        const gridX = Math.floor( x / 16 );
        const gridY = Math.floor( y / 16 );

        if ( selected.x === gridX && selected.y === gridY ) {
            return;
        }

        setSelected( { x: gridX, y: gridY } );

        document.body.style.cursor = `pointer`;
        for ( const object of objects ) {
            if ( Math.floor( x ) === object.x * 16 + 16 && y >= object.y * 16 && y <= object.y * 16 + 16 ) {
                document.body.style.cursor = `col-resize`;
                break;
            }
        }
    };

    useEffect(() => {
        // Load tileset image on 1st load.
        const tileset = new Image();
        tileset.src = urban;
        tileset.onload = () => setTileset( tileset );

        // Set up animation loop on 1st load.
        let prevTicks = null;
        const tick = ticks => {
            if ( prevTicks === null ) {
                prevTicks = ticks;
            }
            else {
                const delta = ticks - prevTicks;
                if ( delta > 1000 / 8 ) {
                    setFrame( frame => frame + 1 );
                    prevTicks = ticks;
                }
            }
            window.requestAnimationFrame( tick );
        }
        window.requestAnimationFrame( tick );

        return () => {
            window.cancelAnimationFrame( tick );
        };
    }, []);

    // Generate gridline image whene’er width or height changes.
    useEffect(() => {
        if ( canvasRef.current ) {
            const gridImage = document.createElement( `canvas` );
            gridImage.width = width * 16;
            gridImage.height = height * 16;
            gridImage.style.opacity = 0.05;
            const gridImageCtx = gridImage.getContext( `2d` );
        
            gridImageCtx.strokeStyle = `#000000`;
            gridImageCtx.lineWidth = 1;
        
            for ( let i = 16; i < height * 16; i += 16 ) {
                gridImageCtx.moveTo( 0, i );
                gridImageCtx.lineTo( width * 16, i );
                gridImageCtx.stroke();
            }
        
            for ( let i = 16; i < width * 16; i += 16 ) {
                gridImageCtx.moveTo( i, 0 );
                gridImageCtx.lineTo( i, height * 16 );
                gridImageCtx.stroke();
            }

            setGridImage( gridImage );
        }
    }, [width, height]);

    const render = ctx => {
        ctx.clearRect( 0, 0, width * 16, height * 16 );

        // Render objects.
        if ( tileset !== null ) {
            const tileRenderer = createTileRenderer( ctx, tileset );
            objects.forEach( object => {
                types[ object.type ].render( tileRenderer, object, frame );
            } );
        }

        // Render highlight o’er selected object.
        if ( selectedObject !== null ) {
            const object = objects[ selectedObject ];
            ctx.fillStyle = `rgba( 0, 64, 128, 0.5 )`;
            ctx.fillRect( object.x * 16, object.y * 16, ( object.width ?? 1 ) * 16, ( object.height ?? 1 ) * 16 );
        }

        // Render highlight o’er selected grid box.
        const gridXPixels = selected.x * 16;
        const gridYPixels = selected.y * 16;
        ctx.fillStyle = `rgba( 0, 64, 128, 0.5 )`;
        ctx.fillRect( gridXPixels, gridYPixels, 15, 15 );

        // Render grid lines.
        if ( gridImage !== null ) {
            ctx.drawImage( gridImage, 0, 0 );
        }
    };

    useEffect(() => {
        if ( ! canvasRef.current ) {
            return;
        }
        const ctx = canvasRef.current.getContext( `2d` );
        render( ctx );
    }, [ canvasRef, render ]);

    return <div>
        <div className="window">
            <canvas
                ref={ canvasRef }
                id="editor"
                width={ width * 16 }
                height={ height * 16 }
                onClick={ onClick }
                onContextMenu={ onRightClick }
                onMouseMove={ onMouseMove }
            />
        </div>
        <div>
            <label>
                <span>Width:</span>
                <input type="number" value={ width } onChange={ e => setWidth( e.target.value ) } />
            </label>
            <label>
                <span>Height:</span>
                <input type="number" value={ height } onChange={ e => setHeight( e.target.value ) } />
            </label>
            <label>
                <span>Type:</span>
                <select value={ selectedType } onChange={ e => setSelectedType( e.target.value ) }>
                    { types.map( ( type, i ) => <option key={ i } value={ i }>{ type.name }</option> ) }
                </select>
            </label>
        </div>
        { selectedObject !== null && <div>
            <div>Selected object: { selectedObject }</div>
            {
                types[ objects[ selectedObject ].type ].options.map( ( options, i ) => {
                    const {
                        atts,
                        key,
                        title,
                        type,
                        update,
                        extraUpdate,
                    } = {
                        atts: [],
                        title: `MISSING TITLE`,
                        key: `missingKey`,
                        type: `text`,
                        update: v => v,
                        extraUpdate: () => ({}),
                        ...options,
                    };
                    const extraAtts = {};
                    for ( const key in atts ) {
                        extraAtts[ key ] = typeof atts[ key ] === `function` ? atts[ key ]( objects[ selectedObject ] ) : atts[ key ];
                    }
                    return <label key={ i }>
                        <span>{ title }:</span>
                        <input
                            type={ type }
                            value={ objects[ selectedObject ][ key ] }
                            onChange={ e => updateObject( selectedObject, { [ key ]: update( e.target.value ), ...extraUpdate( objects[ selectedObject ], e.target.value ) } ) }
                            { ...extraAtts }
                        />
                    </label>;
                } )
            }
            <button onClick={ () => {
                setObjects( objects => objects.filter( ( _, i ) => i !== selectedObject ) )
                setSelectedObject( null );
            } }>Delete</button>
        </div> }
    </div>;
};

const Editor = () => {
    const [ isLoaded, setIsLoaded ] = useState( false );
    const [ width, setWidth ] = useState( null );
    const [ height, setHeight ] = useState( null );
    const [ objects, setObjects ] = useState( [] );

    const update = ( key, value ) => {
        switch ( key ) {
            case `Width`:
                setWidth( value );
                break;
            case `Height`:
                setHeight( value );
                break;
            case `Objects`:
                setObjects( value );
                break;
        }
        window.electronAPI.enableSave();
    };

    const onImport = data => {
        const { buffer } = data;
        const view = new DataView( buffer );

        // Read width and height from buffer.
        setWidth( view.getUint16( 0 ) );
        setHeight( view.getUint16( 2 ) );

        // Read object data from buffer.
        const objects = [];
        let state = `readingType`;
        let type = 0;
        let i = 4; // Initialize to bytes after width & height.
        while ( i < buffer.byteLength ) {
            if ( state === `readingType` ) {
                type = view.getUint16( i );
                i += 2; // Move to bytes after type.
                state = `readingObjectData`;
            } else {
                const object = {};

                // Go thru each object data type, read from buffer, then move forward bytes read.
                const data = types[ type ].exportData;
                data.forEach( ( { type, data } ) => {
                    object[ data ] = view[ `get${ type }` ]( i );
                    i += getDataTypeSize( type );
                });
                objects.push( createObject({ ...object, type }) );

                // Since object has been fully read, try reading the next object’s type.
                state = `readingType`;
            }
        }
        setObjects( objects );
        setIsLoaded( true );
    };

    const createNewMap = () => {
        setWidth( 20 );
        setHeight( 20 );
        setObjects( [] );
        setIsLoaded( true );
    };

    const generateDataBytes = () => {
        // Initialize size to bytes for width and height & initialize data list with width and height.
        let size = 4;
        const dataList = [
            { type: `Uint16`, data: width, i: 0 },
            { type: `Uint16`, data: height, i: 2 },
        ];

        // For each object, add 2 bytes for type, then add bytes for each object data type & add each datum to data list & increment total bytes size.
        objects.forEach( object => {
            size += 2;
            dataList.push( { type: `Uint16`, data: object.type } );
            const data = types[ object.type ].exportData;
            size += data.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
            dataList.push( ...data.map( ( { type, data } ) => ( { type, data: object[ data ] } ) ) );
        });

        // Having calculated the total size, create a buffer, view, and iterate through data list to set each datum in the buffer.
        const buffer = new ArrayBuffer( size );
        const view = new DataView( buffer );
        let i = 0;
        dataList.forEach( ( { type, data } ) => {
            view[ `set${ type }` ]( i, data );
            i += getDataTypeSize( type );
        });
        return view;
    };

    useEffect(() => {
        window.electronAPI.onNew( createNewMap );
        window.electronAPI.onOpen( onImport );
        window.electronAPI.onClose( () => {
            setWidth( 20 );
            setHeight( 20 );
            setObjects( [] );
            setIsLoaded( false );
        });

        return () => {
            window.electronAPI.removeNewListener();
            window.electronAPI.removeOpenListener();
            window.electronAPI.removeCloseListener();
        };
    }, []);

    useEffect(() => {
        window.electronAPI.onSave( file => {
            window.electronAPI.save(generateDataBytes());
        });

        return () => {
            window.electronAPI.removeSaveListener();
        };
    }, [ width, height, objects ]);

    return <div>
        { isLoaded && <Canvas
            height={ height }
            objects={ objects }
            update={ update }
            width={ width }
        /> }
    </div>;
};

export default Editor;
