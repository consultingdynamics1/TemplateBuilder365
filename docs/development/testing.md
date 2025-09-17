# Testing Guide

## Testing Overview

TemplateBuilder365 includes comprehensive testing for both frontend React components and backend serverless API integration.

## Frontend Testing

### Development Testing
The primary testing approach is manual testing using the development server:

```bash
npm run dev  # Start development server on localhost:5174
```

### Testing Features

#### Canvas Testing
- **Element Creation**: Test all element types (text, rectangle, image, table)
- **Element Manipulation**: Move, resize, duplicate, delete operations
- **Tool Switching**: Keyboard shortcuts and toolbar tool selection
- **Zoom and Pan**: Mouse wheel zoom, canvas panning, fit-to-screen
- **Grid Snapping**: Toggle grid and test element snapping

#### File Operations Testing
- **Save Projects**: Test "Save As" dialog with folder selection
- **Load Projects**: Test .tb365 file loading and compatibility
- **localStorage**: Verify localStorage backup functionality
- **Template Restoration**: `npm run restore` to reset templates

#### Authentication Testing
- **Development Mode**: Mock user authentication bypass
- **Stage Mode**: Real Cognito OAuth flow testing
- **Login/Logout**: User interface and session management
- **Protected Routes**: Unauthenticated access handling

### Code Quality Testing

#### TypeScript Validation
```bash
tsc -b  # Type check entire project
```

#### ESLint Code Quality
```bash
npm run lint  # Check code style and quality
```

#### Build Validation
```bash
npm run build        # Production build test
npm run build:stage  # Stage deployment build test
npm run build:prod   # Production deployment build test
```

### Browser Testing
- **Chrome**: Primary development browser
- **Firefox**: Cross-browser compatibility
- **Safari**: macOS compatibility testing
- **Mobile**: Responsive design testing

## Backend Testing

### Integration API Testing Suite

Located in `integration-api/` with comprehensive test scripts:

```bash
cd integration-api

# Complete pipeline testing
npm run test:pipeline      # Full TB365 → HTML → Variables → Multi-format
npm run test:end-to-end    # TB365 → HTML → Variables
npm run test:variables     # Variable replacement only
npm run test:renderer      # PNG generation test
npm run test:production    # Security and validation tests
```

### Test Output Structure

#### Organized Test Results
```
integration-api/test-output/
├── 2025-09-16_14-30-15/           # Timestamped test run
│   ├── input-tb365.json (5KB)     # Original TB365 design data
│   ├── data.json (1KB)            # Business variable data
│   ├── template.html (6KB)        # Generated HTML with {{variables}}
│   ├── final.html (6KB)           # Final HTML with data replaced
│   ├── output.png (116KB)         # High-quality screenshot
│   └── metadata.json (2KB)        # Complete pipeline statistics
├── 2025-09-16_15-45-22/           # Another test run
└── latest/                        # Symlink to most recent test
```

### Performance Benchmarks

#### Proven Test Results
| Stage | Duration | Success Rate | Output Quality |
|-------|----------|-------------|----------------|
| TB365 Parsing | 5ms | 100% | 7 elements, 18 variables |
| HTML Generation | 2ms | 100% | 6KB responsive HTML |
| Variable Replacement | 17ms | 100% | All variables replaced |
| PNG Generation | 3.0s | 100% | 116KB high-quality |
| **Total Pipeline** | **7.1s** | **80%** | **Professional documents** |

### Test Data Validation

#### Sample TB365 Input
```json
{
  "projectName": "Real Estate Flyer",
  "canvasState": {
    "elements": [
      {
        "type": "text",
        "content": "{{agency.name}}",
        "fontSize": 24,
        "fontWeight": "bold"
      },
      {
        "type": "text",
        "content": "Price: ${{property.price}}",
        "fontSize": 18
      }
    ]
  }
}
```

#### Sample Business Data
```json
{
  "agency": {
    "name": "Mountain View Realty",
    "phone": "(555) 123-4567",
    "email": "info@mountainviewrealty.com"
  },
  "property": {
    "price": "895000",
    "address": "123 Mountain View Dr",
    "bedrooms": "4",
    "bathrooms": "3"
  }
}
```

#### Expected Output Validation
- **HTML Structure**: Valid HTML5 with embedded CSS
- **Variable Replacement**: 100% success rate (18/18 variables)
- **Image Quality**: 1200x800px PNG at 116KB
- **Processing Time**: Sub-10 second total pipeline

## Security Testing

### Input Validation Testing
- **Template Size**: 10MB limit with performance warnings
- **Data Types**: Object validation with null/undefined handling
- **XSS Protection**: Aggressive sanitization testing
- **Format Validation**: Phone, email, URL format checking

### Security Test Cases
```javascript
// XSS injection attempts
const maliciousData = {
  agency: {
    name: "<script>alert('xss')</script>",
    phone: "javascript:alert('xss')"
  }
};

// Expected: Sanitized output with scripts removed
```

### Authentication Security
- **JWT Validation**: Token format and expiration testing
- **User Isolation**: Cross-user access prevention
- **HTTPS Requirements**: crypto.subtle availability testing
- **CORS**: Cross-origin request handling

## Load Testing

### Scalability Testing
- **Concurrent Requests**: 10 simultaneous variable replacements
- **Memory Usage**: <5MB increase under load
- **Rate Limiting**: 10,000+ replacements/second capability
- **Error Recovery**: Non-blocking failures with continued processing

### Stress Test Scenarios
```javascript
// High variable count testing
const stressTestData = {
  variables: Array.from({length: 1000}, (_, i) => ({
    key: `variable_${i}`,
    value: `Test Value ${i}`
  }))
};
```

## Error Handling Testing

### Graceful Degradation
- **Partial Failures**: Continue processing with some failures
- **Memory Management**: Automatic cleanup testing
- **Stage Tracking**: Detailed error reporting validation
- **Recovery**: System recovery after failures

### Error Test Cases
- **Invalid TB365 Format**: Malformed JSON handling
- **Missing Variables**: Undefined variable replacement
- **Network Failures**: S3 and API timeout handling
- **Authentication Failures**: JWT expiration and invalid tokens

## Local Lambda Testing

### Development Testing
```bash
cd integration-api
npm run invoke:local  # Local Lambda testing without AWS
```

### Mock Data Testing
```javascript
// Local test event
const testEvent = {
  body: JSON.stringify({
    tb365Data: sampleTB365Data,
    data: sampleBusinessData,
    options: { outputFormat: 'json' }
  }),
  headers: {
    'Authorization': 'Bearer mock-jwt-token'
  }
};
```

## Environment Testing

### Development Environment
- **Mock Authentication**: Verify auth bypass works
- **Local File Storage**: Test "Save As" dialog
- **Variable Replacement**: Ensure development config applied
- **Hot Reload**: HMR functionality testing

### Stage Environment
- **Real Authentication**: Cognito OAuth flow testing
- **HTTPS**: crypto.subtle availability verification
- **S3 Integration**: Cloud storage operations testing
- **API Integration**: Lambda function connectivity

### Production Environment
- **Full Stack**: Complete authentication → S3 → API flow
- **Performance**: Production load testing
- **Security**: Real-world security scenario testing
- **Monitoring**: Error tracking and logging validation

## Test Automation Opportunities

### Future Test Automation
- **Unit Tests**: Jest/Vitest for individual components
- **Integration Tests**: Cypress for end-to-end workflows
- **API Tests**: Automated Lambda function testing
- **Visual Regression**: Screenshot comparison testing

### CI/CD Integration
- **GitHub Actions**: Automated testing on push
- **Pre-commit Hooks**: Code quality enforcement
- **Deployment Tests**: Automated deployment validation
- **Performance Monitoring**: Automated performance regression detection

## Manual Testing Checklist

### Pre-deployment Testing

#### Frontend Checklist
- [ ] All tools work (select, text, rectangle, image, table)
- [ ] Element manipulation (move, resize, duplicate, delete)
- [ ] Properties panel updates for all element types
- [ ] Zoom and pan functionality
- [ ] Grid snapping on/off
- [ ] Save/load operations
- [ ] Authentication flow (stage/production)
- [ ] Responsive design on different screen sizes

#### Backend Checklist
- [ ] Complete pipeline test passes
- [ ] Variable replacement 100% success
- [ ] PNG generation produces quality output
- [ ] Security validation prevents XSS
- [ ] Performance within acceptable limits
- [ ] Error handling gracefully degrades
- [ ] Authentication validates JWT properly

### Post-deployment Verification
- [ ] Live URL accessible and functional
- [ ] Authentication flow works end-to-end
- [ ] File operations save to correct location
- [ ] API endpoints respond correctly
- [ ] No console errors in browser
- [ ] Performance meets expectations

## Debugging and Troubleshooting

### Frontend Debugging
- **Browser DevTools**: React components and state inspection
- **Zustand DevTools**: State management debugging
- **Network Tab**: API request monitoring
- **Console Logging**: Strategic console.log placement

### Backend Debugging
- **CloudWatch Logs**: AWS Lambda execution logs
- **Local Testing**: `npm run invoke:local` for debugging
- **Performance Profiling**: Stage-by-stage timing analysis
- **Error Tracking**: Comprehensive error reporting review

### Common Testing Issues

#### Canvas Rendering Issues
- Check Konva.js version compatibility
- Verify stage size and container mounting
- Monitor performance with large element counts

#### Authentication Issues
- Verify HTTPS context for crypto.subtle
- Check JWT token format and expiration
- Validate Cognito configuration settings

#### File Operation Issues
- Test localStorage availability and quotas
- Verify S3 permissions and bucket configuration
- Check file format compatibility (.tb365)

#### API Integration Issues
- Validate request/response formats
- Check CORS configuration
- Monitor Lambda execution logs for errors