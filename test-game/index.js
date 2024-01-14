// not normally allowed
const process = require('process');

const { Game, GameNode, Colors, Shapes, ShapeUtils } = require(process.env.SQUISH_PATH);

class TestGame extends Game {
    static metadata() {
        return {
            aspectRatio: {x: 16, y: 9},
            author: 'Joseph Garcia',
            thumbnail: 'f103961541614b68c503a9ae2fd4cc47',
            squishVersion: '1005',
            tickRate: process.env.TICK_RATE || 10
        };
    }

    tick() {
        // cause render
        this.base.node.fill = this.base.node.fill;
    }

    constructor() {
        super();

        const baseColor = Colors.randomColor();
        this.base = new GameNode.Shape({
            shapeType: Shapes.POLYGON,
            coordinates2d: [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
                [0, 0]
            ],
            fill: baseColor,
            onClick: this.handleLayerClick
        });
        
        const baseWidth = process.env.BASE_WIDTH || 16;
        const baseHeight = process.env.BASE_HEIGHT || 9;
        const scaleFactor = process.env.SCALE_FACTOR || 1;
        console.log('using scale factor ' + scaleFactor);

        let nodeCount = 0;
        for (let i = 0; i < baseWidth * scaleFactor; i++) {
            for (let j = 0; j < baseHeight * scaleFactor; j++) {
                const newNode = new GameNode.Shape({
                    shapeType: Shapes.POLYGON,
                    coordinates2d: ShapeUtils.rectangle(i, j, 100 / (baseWidth * scaleFactor), 100 / (baseHeight * scaleFactor)),
                    fill: Colors.randomColor()
                });

                this.base.addChild(newNode);
                nodeCount++;
            }
        }

        console.log('new node count ' + nodeCount);

    }

    handleNewPlayer({ playerId, info, settings }) {
    }

    handlePlayerDisconnect() {
    }

    handleLayerClick() {
        const newColor = Colors.randomColor();
        this.color = newColor;
        this.fill = newColor;
    }

    getLayers() {
        return [
            {
                root: this.base      
            }
        ];
    }
}

module.exports = TestGame;
