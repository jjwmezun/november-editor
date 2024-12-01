import '../assets/editor.scss';
import React, { useEffect, useRef, useState } from 'react';
import urban from '../assets/urban.png';

const createTileRenderer = ( ctx, tileset, layer, windowScrollX ) => args => {
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
    ctx.drawImage(
        tileset,
        srcx * 8,
        srcy * 8,
        w * 8,
        h * 8,
        x * 8 + windowScrollX * layer.scrollX,
        y * 8,
        w * 8,
        h * 8
    );
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

const layerTypes = Object.freeze({
    block: {
        slug: `block`,
        title: `Block`,
    }
});

const createNewLayer = () => ({
    type: layerTypes.block,
    objects: [],
    scrollX: 1.0,
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
    {
        name: `Fence`,
        create: ( x, y ) => ({
            x: x,
            y: y,
            width: 4,
            height: 3,
        }),
        render: ( tileRenderer, object ) => {
            // Render top row.
            for ( let x = 0; x < object.width; x++ ) {
                tileRenderer({
                    srcx: x % 3 === 0 ? 4 : 6,
                    x: object.xTiles() + x * 2,
                    y: object.yTiles(),
                    w: 2,
                });
            }
            for ( let y = 1; y < object.heightTiles(); y++ ) {
                for ( let x = 0; x < object.width; x += 3 ) {
                    // Render leftmost column.
                    tileRenderer({
                        srcx: y === 1 ? 8 : ( y === 2 ? 11 : 12 ),
                        x: object.xTiles() + x * 2,
                        y: object.yTiles() + y,
                    });

                    // Render center.
                    tileRenderer({
                        srcx: 9,
                        x: object.xTiles() + x * 2 + 1,
                        y: object.yTiles() + y,
                        w: 2,
                    });
                    for ( let i = 3; i < 6; i++ ) {
                        tileRenderer({
                            srcx: 10,
                            x: object.xTiles() + x * 2 + i,
                            y: object.yTiles() + y,
                        });
                    }
                }
            }
        },
        exportData: [
            { type: `Uint16`, data: `x`, },
            { type: `Uint16`, data: `y`, },
            { type: `Uint16`, data: `width`, },
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
                    min: 4,
                    max: Math.pow( 2, 16 ) - 1,
                },
            },
        ],
    },
]);

const getDataTypeSize = type => parseInt( type.match( /^[a-zA-Z]+([0-9]+)$/ )[ 1 ] ) / 8;

const getMousePosition = e => ({
    x: e.clientX - e.target.offsetLeft,
    y: e.clientY - e.target.offsetTop,
});

const Canvas = props => {
    const canvasRef = useRef();
    const { height, layers, update, width } = props;
    const [ gridImage, setGridImage ] = useState( null );
    const [ selected, setSelected ] = useState( { x: null, y: null } );
    const [ selectedObject, setSelectedObject ] = useState( null );
    const [ tileset, setTileset ] = useState( null );
    const [ selectedType, setSelectedType ] = useState( 0 );
    const [ frame, setFrame ] = useState( 0 );
    const [ selectedLayer, setSelectedLayer ] = useState( 0 );
    const [ windowScrollX, setWindowScrollX ] = useState( 0 );
    const { objects } = selectedLayer === null ? [] : layers[ selectedLayer ];

    useEffect(() => {
        if ( selectedLayer === null || layers[ selectedLayer ].objects.length === 0 ) {
            setSelected( { x: null, y: null } );
            setSelectedObject( null );
            setSelectedLayer( null );
            setSelectedType( 0 );
        }
    }, [ layers ]);

    const setWidth = width => update( `Width`, width );
    const setHeight = height => update( `Height`, height );

    const addObject = o => {
        update( `Layers`, layers => {
            const newLayers = [ ...layers ];
            newLayers[ selectedLayer ].objects.push( createObject( o ) );
            return newLayers;
        });
    };

    const updateObject = ( index, o ) => {
        update( `Layers`, layers => {
            const newLayers = [ ...layers ];
            newLayers[ selectedLayer ].objects[ index ] = { ...newLayers[ selectedLayer ].objects[ index ], ...o };
            return newLayers;
        });
    };

    const removeObject = () => {
        update( `Layers`, layers => {
            const newLayers = [ ...layers ];
            newLayers[ selectedLayer ].objects = newLayers[ selectedLayer ].objects.filter( ( _, i ) => i !== selectedObject );
            return newLayers;
        });
        setSelectedObject( null );
    };

    const addLayer = () => {
        setSelectedLayer( layers.length );
        setSelectedObject( null );
        update( `Layers`, layers => [ ...layers, createNewLayer() ] );
    };

    const removeLayer = () => {
        const layersCount = layers.length - 1;
        update( `Layers`, layers => layers.filter( ( _, i ) => i !== selectedLayer ) )
        setSelectedLayer( selectedLayer === 0 ? ( selectedLayer === layersCount ? null : selectedLayer + 1 ) : selectedLayer - 1 );
    };

    const updateLayerOption = ( key, value ) => {
        update( `Layers`, layers => {
            const newLayers = [ ...layers ];
            newLayers[ selectedLayer ][ key ] = value;
            return newLayers;
        });
    };

    const onLayerSelection = e => {
        const options = e.target.querySelectorAll(`option`);
        for ( let i = 0; i < options.length; i++ ) {
            if ( options[ i ].selected ) {
                setSelectedLayer( i );
                break;
            }
        }
        setSelectedObject( null );
    };

    const moveLayerUp = () => {
        update( `Layers`, layers => {
            const newLayers = [ ...layers ];
            const temp = newLayers[ selectedLayer ];
            newLayers[ selectedLayer ] = newLayers[ selectedLayer - 1 ];
            newLayers[ selectedLayer - 1 ] = temp;
            return newLayers;
        });
        setSelectedLayer( selectedLayer - 1 );
    };

    const moveLayerDown = () => {
        update( `Layers`, layers => {
            const newLayers = [ ...layers ];
            const temp = newLayers[ selectedLayer ];
            newLayers[ selectedLayer ] = newLayers[ selectedLayer + 1 ];
            newLayers[ selectedLayer + 1 ] = temp;
            return newLayers;
        });
        setSelectedLayer( selectedLayer + 1 );
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
        e.preventDefault();

        if ( selectedLayer === null ) {
            return;
        }

        const { x, y } = getMousePosition( e );

        const gridX = Math.floor( x / 16 );
        const gridY = Math.floor( y / 16 );

        addObject( { ...types[ selectedType ].create( gridX, gridY ), type: selectedType } );
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
    };

    const onScrollWindow = e => {
        setWindowScrollX( e.target.scrollLeft );
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
            const gridImageCtx = gridImage.getContext( `2d` );
        
            gridImageCtx.strokeStyle = `#4488ff`;
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
            layers.forEach( ( layer, i ) => {
                const tileRenderer = createTileRenderer( ctx, tileset, layer, windowScrollX );

                // Fade out layer if not selected.
                ctx.globalAlpha = selectedLayer === i ? 1.0 : 0.5;

                layer.objects.forEach( object => {
                    types[ object.type ].render( tileRenderer, object, frame );
                } );
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
            ctx.globalAlpha = 0.5;
            ctx.drawImage( gridImage, 0, 0 );
            ctx.globalAlpha = 1.0;
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
        <div className="window" onScroll={ onScrollWindow }>
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
        { selectedLayer !== null && <div>
            <label>
                <span>Scroll X:</span>
                <input type="number" value={ layers[ selectedLayer ].scrollX } onChange={ v => updateLayerOption( `scrollX`, v.target.value ) } />
            </label>
        </div> }
        { selectedLayer !== null && selectedObject !== null && <div>
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
            <button onClick={ removeObject }>Delete</button>
        </div> }
        <select selected={ selectedLayer } size={ Math.min( layers.length + 1, 10 ) } onChange={ onLayerSelection }>
            { layers.map( ( layer, i ) => <option key={ i }>Layer { i + 1 } – { layer.type.title }</option> ) }
        </select>
        <button disabled={ layers.length >= 255 } onClick={ addLayer }>Add layer</button>
        <button onClick={ removeLayer }>Delete layer</button>
        <button disabled={ selectedLayer === null || selectedLayer === 0 } onClick={ moveLayerUp }>↑</button>
        <button disabled={ selectedLayer === null || selectedLayer === layers.length - 1 } onClick={ moveLayerDown }>↓</button>
    </div>;
};

const Editor = () => {
    const [ isLoaded, setIsLoaded ] = useState( false );
    const [ width, setWidth ] = useState( null );
    const [ height, setHeight ] = useState( null );
    const [ layers, setLayers ] = useState( [ createNewLayer() ] );

    const update = ( key, value ) => {
        switch ( key ) {
            case `Width`:
                setWidth( value );
                break;
            case `Height`:
                setHeight( value );
                break;
            case `Layers`:
                setLayers( value );
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

        // Read layer data from buffer.
        const layers = [];
        const layerCount = view.getUint8( 4 );
        for ( let i = 0; i < layerCount; i++ ) {
            layers.push( createNewLayer() );
        }
        let currentLayer = 0;
        let state = `readingLayerOptions`;
        let type = 0;
        let i = 5; // Initialize to bytes after width, height, & layer count.
        while ( currentLayer < layerCount ) {
            if ( state === `readingLayerOptions` ) {
                layers[ currentLayer ].scrollX = view.getFloat32( i );
                i += 4; // Move to bytes after layer options.
                state = `readingType`;
            } else if ( state === `readingType` ) {
                type = view.getUint16( i );
                // If type is terminator, move to next layer.
                if ( type === 0xFFFF ) {
                    ++currentLayer;
                    i += 2; // Move to bytes after type.
                    state = `readingLayerOptions`;
                }
                // Otherwise, interpret bytes as type for next object.
                else {
                    if ( layers.length === 0 ) {
                        throw new Error( `No layers found in buffer.` );
                    }
                    state = `readingObjectData`;
                    i += 2; // Move to bytes after type.
                }
            } else {
                // Initialize object with type’s default.
                const object = types[ type ].create( 0, 0 );

                // Go thru each object data type, read from buffer, then move forward bytes read.
                const data = types[ type ].exportData;
                data.forEach( ( { type, data } ) => {
                    object[ data ] = view[ `get${ type }` ]( i );
                    i += getDataTypeSize( type );
                });
                layers[ currentLayer ].objects.push( createObject({ ...object, type }) );

                // Since object has been fully read, try reading the next object’s type.
                state = `readingType`;
            }
        }
        setLayers( layers );
        setIsLoaded( true );
    };

    const createNewMap = () => {
        setWidth( 20 );
        setHeight( 20 );
        setLayers( [ createNewLayer() ] );
        setIsLoaded( true );
    };

    const generateDataBytes = () => {
        // Initialize data list with width, height, & layers count.
        const dataList = [
            { type: `Uint16`, data: width },
            { type: `Uint16`, data: height },
            { type: `Uint8`, data: layers.length },
        ];

        layers.forEach( layer => {
            // Add layer options.
            dataList.push({ type: `Float32`, data: layer.scrollX });

            // For each object, add 2 bytes for type, then add bytes for each object data type
            // & add each datum to data list.
            layer.objects.forEach( object => {
                dataList.push( { type: `Uint16`, data: object.type } );
                const data = types[ object.type ].exportData;
                dataList.push( ...data.map( ( { type, data } ) => ( { type, data: object[ data ] } ) ) );
            });

            // Add terminator for layer.
            dataList.push( { type: `Uint16`, data: 0xFFFF } );
        });

        // Having calculated the total size, create a buffer, view, & iterate through data list
        // to set each datum in the buffer.
        const size = dataList.reduce( ( acc, { type } ) => acc + getDataTypeSize( type ), 0 );
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
            setLayers( [ createNewLayer() ] );
            setIsLoaded( false );
        });

        return () => {
            window.electronAPI.removeNewListener();
            window.electronAPI.removeOpenListener();
            window.electronAPI.removeCloseListener();
        };
    }, []);

    useEffect(() => {
        window.electronAPI.onSave( () => {
            window.electronAPI.save( generateDataBytes() );
        });

        return () => {
            window.electronAPI.removeSaveListener();
        };
    }, [ width, height, layers ]);

    return <div>
        { isLoaded && <Canvas
            height={ height }
            layers={ layers }
            update={ update }
            width={ width }
        /> }
    </div>;
};

export default Editor;
