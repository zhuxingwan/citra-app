

const IG_COLOR_RED = [255, 0, 0, 255];
const IG_COLOR_GREEN = [0, 255, 0, 255];
const IG_COLOR_BLUE = [0, 0, 255, 255];
const IG_COLOR_BLACK = [0, 0, 0, 255];
const IG_COLOR_WHITE = [255, 255, 255, 255];

class ImageGrid {

    // type of data is Uint8ClampedArray
    constructor (data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
    }

    // color is array [r,g,b,a]
    setImagePixel(x, y, color) {
        var offset = (y * this.width + x)*4;
        for (var i = 0; i < color.length; i++) {
            this.data[offset + i] = color[i];
        }
    }

    getImagePixel(x, y) {
        var offset = (y * this.width + x)*4;
        var color = [0,0,0,0]; // color is array [r,g,b,a]
        for (var i = 0; i < color.length; i++) {
            color[i] = this.data[offset + i];
        }

        return color;
    }

    // detect character boundary, assuming character is black
    getCharacter() {
        var max_x = 0;
        var max_y = 0;
        var min_x = 999999999;
        var min_y = 999999999;
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                if (this.getImagePixel(x, y)[0] == IG_COLOR_BLACK[0]) {
                    if (x < min_x) min_x = x;
                    if (y < min_y) min_y = y;
                    if (x > max_x) max_x = x;
                    if (y > max_y) max_y = y;
                }
            }
        }

        var boundary = [[min_x, min_y], [max_x, max_y]];

        var char_width = max_x-min_x+1;
        var char_height = max_y-min_y+1;
        var char_grid = new Array(char_height);
        for (var y = min_y; y <= max_y; y++) {
            char_grid[y-min_y] = new Array(char_width);
            for (var x = min_x; x <= max_x; x++) {
                char_grid[y-min_y][x-min_x] = (this.getImagePixel(x, y)[0] == IG_COLOR_BLACK[0]) ? 1 : 0;
            }
        }

        return {
            grid: char_grid,
            boundary: boundary
        };
    }

    drawSquare(x, y, color) {
        for (var i = x-3; i <= x+3; i++) {
            this.setImagePixel(i, y-3, color);
            this.setImagePixel(i, y+3, color);
        }
        for (var i = y-3; i < y+3; i++) {
            this.setImagePixel(x-3, i, color);
            this.setImagePixel(x+3, i, color);
        }
    }


    // draw border
    drawBorder(boundary) {
        var min_x = boundary[0][0];
        var min_y = boundary[0][1];
        var max_x = boundary[1][0];
        var max_y = boundary[1][1];
        
        for (var y = min_y - 1; y < max_y + 1; y++) {
            this.setImagePixel(min_x - 1, y, IG_COLOR_RED);
            this.setImagePixel(max_x + 1, y, IG_COLOR_RED);
        }
        for (var x = min_x - 1; x <= max_x + 1; x++) {
            this.setImagePixel(x, min_y - 1, IG_COLOR_RED);
            this.setImagePixel(x, max_y + 1, IG_COLOR_RED);
        }
    }

    // assuming threshold is between 0 and 100 (percentage)
    makeBlackWhite(threshold) {
        var threshold_byte = threshold * 255 / 100;
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var crt_color = this.getImagePixel(x, y);
                var avg_color = (crt_color[0] + crt_color[1] + crt_color[2])/3;

                if (avg_color <= threshold_byte) {
                    this.setImagePixel(x, y, IG_COLOR_BLACK);
                } else {
                    this.setImagePixel(x, y, IG_COLOR_WHITE);
                }
            }
        }
    }

    rgbToHSV(r, g, b) {
        r /= 255, g /= 255, b /= 255;

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;
      
        var d = max - min;
        s = max == 0 ? 0 : d / max;
      
        if (max == min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
          }
      
          h /= 6;
        }
      
        return [ h, s, v ];
    }

    rgbToYcbcr(r, g, b) {
        return [16 + (65.481*r + 128.553*g + 24.966*b),
            128 + (-37.797*r - 74.203*g + 112*b),
            128 + (112*r - 93.786*g - 18.214*b)];
    }

    isPixelSkin(x, y) {
        var isSkin = false;

        var color_rgba = this.getImagePixel(x, y);
        var color_hsv = this.rgbToHSV(color_rgba[0], color_rgba[1], color_rgba[2]);
        var color_ycbcr = this.rgbToYcbcr(color_rgba[0], color_rgba[1], color_rgba[2])

        var R = color_rgba[0];
        var G = color_rgba[1];
        var B = color_rgba[2];
        var A = color_rgba[3];
        var H = color_hsv[0];
        var S = color_hsv[1];
        var V = color_hsv[2];
        var Y = color_ycbcr[0];
        var Cb = color_ycbcr[1];
        var Cr = color_ycbcr[2];

        if ( H > 0.0 && H <=50.0 && S > 0.23 && S <= 0.68 && R > 95 && G > 40 && B > 20 && R > G && R > B && Math.abs(R - G) > 15 && A > 15) {
            isSkin = true;
        }

        if (R > 95 && 
            G > 40 && 
            B > 20 &&
            R > G &&
            R > B &&
            Math.abs(R-G) > 15 && 
            A > 15 &&
            Cr > 135 &&
            Cb > 85 &&
            Y > 80 &&
            Cr <= (1.5862*Cb)+20 &&
            Cr >= (0.3448*Cb)+76.2069 &&
            Cr >= (-4.5652*Cb)+234.5652 &&
            Cr <= (-1.15*Cb)+301.75 &&
            Cr <= (-2.2857*Cb)+432.85) {
                isSkin = true;
            }

        return isSkin;
    }

    detectHumanSkin() {
        var point_data = [];    // store all human skin pixel location
        var visited = [];

        var x_min = 999999;
        var y_min = 999999;
        var x_max = 0;
        var y_max = 0;
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                if (!this.isPixelSkin(x, y)) {
                    this.setImagePixel(x, y, IG_COLOR_BLACK);
                } else {
                    point_data.push({x: x,y: y, visited: false});
                    if (visited[x] == undefined) visited[x] = [];
                    visited[x][y] = false;

                    if (x < x_min) x_min = x;
                    if (y < y_min) y_min = y;
                    if (x > x_max) x_max = x;
                    if (y > y_max) y_max = y;
                }
            }
        }

        // start flooding to get face candidate
        var MIN_PIXEL_PER_CLUSTER = 25;
        var clusters = [];
        for (var i = 0; i < point_data.length; i++) {
            var crt_cluster = [];
            var x_min_cluster = 999999;
            var y_min_cluster = 999999;
            var x_max_cluster = 0;
            var y_max_cluster = 0;

            var flood_queue = [];
            flood_queue.push({x: point_data[i].x, y: point_data[i].y});
            while (flood_queue.length > 0) {
                var crt_pixel = flood_queue.pop();
                var x = crt_pixel.x;
                var y = crt_pixel.y;
    
                if (visited[x][y] == true) {
                    break;
                } else {
                    visited[x][y] = true;
                    crt_cluster.push({x: x, y: y});
                    if (x < x_min_cluster) x_min_cluster = x;
                    if (y < y_min_cluster) y_min_cluster = y;
                    if (x > x_max_cluster) x_max_cluster = x;
                    if (y > y_max_cluster) y_max_cluster = y;
                }
    
                if (y-1 >= 0) { 
                    if(this.isPixelSkin(x,y-1)) flood_queue.push({x: x, y: y-1});
                    if (!this.isPixelSkin(x, y-1)) this.setImagePixel(x, y-1, IG_COLOR_GREEN);
                }
                if (y-1 >= 0 && x+1 < this.width) { 
                    if(this.isPixelSkin(x+1, y-1)) flood_queue.push({x: x+1, y: y-1}); 
                    if (!this.isPixelSkin(x+1, y-1)) this.setImagePixel(x+1, y-1, IG_COLOR_GREEN);
                }
                if (x+1 < this.width) { 
                    if(this.isPixelSkin(x+1,y)) flood_queue.push({x: x+1, y: y});
                    if (!this.isPixelSkin(x+1, y)) this.setImagePixel(x+1, y, IG_COLOR_GREEN);
                }
                if (x+1 < this.width && y+1 < this.height) {
                    if(this.isPixelSkin(x+1,y+1)) flood_queue.push({x: x+1, y: y+1});
                    if (!this.isPixelSkin(x+1, y+1)) this.setImagePixel(x+1, y+1, IG_COLOR_GREEN);
                }
                if (y+1 < this.height) {
                    if(this.isPixelSkin(x,y+1)) flood_queue.push({x: x, y: y+1});
                    if (!this.isPixelSkin(x, y+1)) this.setImagePixel(x, y+1, IG_COLOR_GREEN);
                }
                if (y+1 < this.height && x-1 >= 0){
                    if(this.isPixelSkin(x-1,y+1)) flood_queue.push({x: x-1, y: y+1});
                    if (!this.isPixelSkin(x-1, y+1)) this.setImagePixel(x-1, y+1, IG_COLOR_GREEN);
                }
                if (x-1 >= 0) {
                    if (this.isPixelSkin(x-1,y)) flood_queue.push({x: x-1, y: y});
                    if (!this.isPixelSkin(x-1, y)) this.setImagePixel(x-1, y, IG_COLOR_GREEN);
                }
            
            }

            if (crt_cluster.length > MIN_PIXEL_PER_CLUSTER) {
                clusters.push({
                    member: crt_cluster,
                    top_left: {
                        x: x_min_cluster,
                        y: y_min_cluster
                    },
                    bottom_right: {
                        x: x_max_cluster,
                        y: y_max_cluster
                    },
                });
            }
        }

        console.log(clusters);

        // draw square per cluster
        // return;
        for (var j = 0; j < clusters.length; j++) {
            var y_min = clusters[j].top_left.y;
            var x_min = clusters[j].top_left.x;
            var y_max = clusters[j].bottom_right.y;
            var x_max = clusters[j].bottom_right.x;

            for (var i = x_min; i <= x_max; i++) {
                this.setImagePixel(i, y_min, IG_COLOR_RED);
                this.setImagePixel(i, y_max, IG_COLOR_RED);
            }
            for (var i = y_min; i <= y_max; i++) {
                this.setImagePixel(x_min, i, IG_COLOR_RED);
                this.setImagePixel(x_max, i, IG_COLOR_RED);
            }
        }
    }

    static convertDataToGrid(data, height, width) {
        var grid = [];
        for (var y = 0; y < height; y++) {
            grid.push(new Array(width));
            for(var x = 0; x < width; x++) {
                var offset = (y * width + x)*4;
                var color = [data[offset], data[offset+1], data[offset+2], data[offset+3]];
                grid[y][x] = color;
            }
        }

        return grid;
    }

    static convertGridToData(grid) {
        var img_data = new Uint8ClampedArray(grid.length * grid[0].length * 4);
        
        var i = 0;
        for (var y = 0; y < grid.length; y++) {
            for(var x = 0; x < grid[0].length; x++) {
                for(var cnl = 0; cnl < 4; cnl++) {
                    img_data[i] = (grid[y][x][cnl]);
                    i = i+1;
                }
            }
        }
        return img_data;
    }

}