import React from 'react';
import { Button, Form, Container, Row, Col, ProgressBar } from 'react-bootstrap';
import { generateImage } from './generate.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { API_URL } from './config';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            uploadedImageURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            uploaded: false,
            fp16: 0,
            resize: "none",
            generationStatus: 0,
            updateGenerationProgressInterval: -1,
            bytesUsed: 0,
            rating: 0, 
            feedback: '', 
            feedbackSubmitted: false,
            uuid: ''
        };
    }

    onUpload = (e) => {
        var input = e.target;
        var reader = new FileReader();
        reader.onload = () => {
            var dataURL = reader.result;
            this.setState({
                uploadedImageURL: dataURL,
                uploaded: true
            }); 
        };
        reader.readAsDataURL(input.files[0]);
    }

    generate = async () => {
        if (this.state.generationStatus !== 0) {
            return;
        }

        console.log(this.state);
        if (this.state.uploaded === false) {
            alert("Please upload an image.");
            return;
        }
        if (this.state.resize === "none") {
            alert("Please select a resize method.");
            return;
        }
        
        window.progress = 0;
        window.bytesUsed = 0;
        let updateGenerationProgressInterval = setInterval(() => {
            this.setState({
                generationProgress: window.progress * 100,
                bytesUsed: window.bytesUsed
            });

            if (this.state.generationStatus !== 1) {
                clearInterval(updateGenerationProgressInterval);
            }
        }, 500);


        this.setState({
            generationStatus: 1,
            updateGenerationProgressInterval: updateGenerationProgressInterval
        });
        let success = false;
        try {
            await generateImage(this.state.resize, this.state.fp16, "uploaded-image", "output");
            success = true;
        } catch (error) {
            alert("Error encountered while generating image: " + error);
            this.setState({
                generationStatus: 0
            });
        }

        if (success) {
            try {
            // Upload orginal image
                const originalImage = this.state.uploadedImageURL.split(',')[1];
                var payload = { base64_image: originalImage , generated: false};
                var response = await fetch( API_URL+'/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                var result = await response.json();
                console.log('API call 1 success: '+result);

                // Upload generated image
                const outputCanvas = document.getElementById('output');
                const generatedImage = outputCanvas.toDataURL('image/png').split(',')[1];
                    payload = { base64_image: generatedImage , generated: true};
                    response = await fetch( API_URL+'/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                result = await response.json();
                console.log('API call 2 success: ');
                
                // API call successful
                if (response.ok) {
                    console.log(result);
    
                    const key = result['key'];
                    const uuid = key ? key.replace('-generated.jpg', '') : '';
                
                this.setState({ uuid: uuid });
                    this.setState({
                        generationStatus: 2,
                    });
                } else {
                    const error = await response.json();
                    console.log(error.message);
                }
            } catch (error) {
                console.log("Error while calling API:" + error);
            }
        }
        
    }

    onRatingChange = (event) => {
        this.setState({
            rating: event.target.value,
        });
    }

    onFeedbackChange = (event) => {
        this.setState({
            feedback: event.target.value,
        });
    }

    submitGeneratedImageFeedback = async () => {
        const { rating, feedback } = this.state;

        try {
            const {uuid} = this.state;
            const feedbackPayload = {
                uuid: uuid,
                rating: rating,
                feedback: feedback,
            };

            const response = await fetch(API_URL+"/feedback", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackPayload),
            });
                var result = await response.json();
                console.log('API call feedback: '+result);
            if (response.ok) {
                // Feedback submitted successfully
                this.setState({
                    feedbackSubmitted: true,
                    rating:0,
                    feedback: ''
                });

            } else {
                const errorResponse = await response.json();
                throw new Error(errorResponse.message || 'Failed to submit feedback');
            }
        } catch (error) {
            alert("Error encountered while submitting feedback: " + error);
        }
    }
    
    componentWillUnmount = () => {
        if (this.state.updateGenerationProgressInterval !== -1) {
            clearInterval(this.state.updateGenerationProgressInterval);
        }
    }
    
    render () {
        return (
            <div className="app">
                <Container fluid style={{"display": this.state.generationStatus === 0 ? "block" : "none"}}>
                    <Row className="margin">
                        <Col/>
                            <Col xs="12">
                                <h1 style={{"marginBottom": "20px", textAlign: "center"}}>AnimeGAN.js: Photo Animation for Everyone <a href="https://github.com/TonyLianLong/AnimeGAN.js" style={{"fontSize": "12px"}}>View Source Code</a></h1>
                            </Col>
                        <Col/>
                    </Row>
                    <Row className="margin">
                        <Col/>
                        <Col xs="12" md="8" lg="6">
                            <Form>
                                <Form.File accept="image/*" label={(this.state.uploaded ? "Change the image" : "Upload an image")} onChange={this.onUpload} multiple={false} custom />
                            </Form>
                            
                        </Col>
                        <Col/>
                    </Row>
                    <Row className="margin">
                        <Col/>
                        <Col xs="12" md="8" lg="5" xl="4" style={{textAlign: "center", margin: "20px"}}>
                            <img id="uploaded-image" alt="" src={this.state.uploadedImageURL} />
                        </Col>
                        <Col/>
                    </Row>
                    <Row className="margin">
                        <Col/>
                        <Col xs="12" md="8" lg="6" style={{textAlign: "center"}}>
                            <Form>
                                <Form.Group controlId="resize">
                                    <Form.Control defaultValue="none" as="select" onChange={(e) => this.setState({resize: e.target.value})}>
                                        <option value="none" disabled>Select Generated Image Size</option>
                                        <option value="s">Small (Fast)</option>
                                        <option value="m">Medium</option>
                                        <option value="l">Large (Slow)</option>
                                        <option value="original">Do Not Resize (Likely to break if the image is too large)</option>
                                    </Form.Control>
                                </Form.Group>
                                <Form.Group controlId="fp16">
                                    <Form.Control as="select" onChange={(e) => this.setState({fp16: parseInt(e.target.value)})}>
                                        <option value="0">Force FP16 For Speed (Lower Quality): No</option>
                                        <option value="1">Force FP16 For Speed (Lower Quality): Yes</option>
                                    </Form.Control>
                                </Form.Group>
                                <Button variant="primary" onClick={this.generate}>Generate</Button>
                            </Form>
                        </Col>
                        <Col/>
                    </Row>
                </Container>

                <div className="overlay" style={{"display": this.state.generationStatus === 1 ? "block" : "none"}}>
                
                    <div style={{"marginTop":"calc( 50vh - 50px )", "height": "100px", "textAlign": "center"}}>
                        <Container fluid>
                            <Row>
                                <Col/>
                                <Col xs="12" md="8" lg="6" style={{textAlign: "center"}}>
                                    <ProgressBar now={this.state.generationProgress} style={{"margin": "10px"}} />
                                    <p>Generating image...</p>
                                    <p>This may take 15 to 30 seconds depending on your device.</p>
                                    <p>Memory usage (MB): {this.state.bytesUsed / 1000000} </p>
                                </Col>
                                <Col/>
                            </Row>
                        </Container>
                    </div>
                    
                </div>

                <div className="overlay" style={{"display": this.state.generationStatus === 2 ? "block" : "none"}}>
                    <Container fluid>
                        <Row className="margin">
                            <Col/>
                            <Col xs="12" md="8" lg="5" xl="4" style={{textAlign: "center", margin: "20px"}}>
                                <canvas id="output"></canvas>
                            </Col>
                            <Col/>
                        </Row>
                        
                        <div className="feedback-section mx-auto" style={{ width: '15%', border: '1px solid #ccc', padding: '10px' }}>
                            {this.state.feedbackSubmitted && (
                                <div className="text-success mt-3">Feedback submitted successfully!</div>
                            )}
                            <div className="form-group">
                                <label>Rating:</label>
                                <select value={this.state.rating} onChange={this.onRatingChange} className="form-control">
                                    {[...Array(6).keys()].map((value) => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Feedback:</label>
                                <textarea value={this.state.feedback} onChange={this.onFeedbackChange} className="form-control" />
                            </div>
                            <button onClick={this.submitGeneratedImageFeedback} className="btn btn-primary">Submit Feedback</button>
                        </div>
                        <Row className="margin">
                            <Col/>
                            <Col xs="12" md="12" lg="12" xl="10" style={{textAlign: "center", margin: "20px"}}>
                                <p>If you are on a mobile device, long press to save the image.</p>
                                <p>If you are on a desktop device, right click to save the image.</p>
                                <p>If it looks good, you could <a href="https://github.com/TonyLianLong/AnimeGAN.js">give AnimeGAN.js a star <span role="img" aria-label="star">🌟</span> on Github</a>.</p>
                                <p>AnimeGAN.js uses the trained model from AnimeGAN. If you are interested in how the TensorFlow version of AnimeGAN works, <a href="https://github.com/TachibanaYoshino/AnimeGAN">click here</a></p>
                                <Button variant="primary" onClick={() => window.location.reload()}>Restart</Button>
                            </Col>
                            <Col/>
                        </Row>
                    </Container>
                </div>
            </div>
        );
    }
}

export default App;

