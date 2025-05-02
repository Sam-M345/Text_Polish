# Diagnostic Mode: Root Cause Analysis

## Objective

Identify the exact root cause of the issue without implementing any fixes, including potential cache-related problems.

## Investigation Process

1. Analyze relevant code files and execution paths
2. Trace data flow to identify where behavior deviates from expectations
3. Insert strategic logging statements with clear identifiers (e.g., [DIAG-1])
4. Examine environment variables and configuration that might impact behavior
5. Investigate potential cache issues:
   - Check server-side caching configuration
   - Verify browser cache state
   - Examine cache headers in responses
   - Compare development vs production caching behavior

## Cache Investigation Steps

1. **Server Cache Check**

   - Verify deployment status
   - Check server cache configuration
   - Examine static file serving settings
   - Review server logs for cache-related issues

2. **Browser Cache Analysis**

   - Check browser's cache storage
   - Verify cache headers in network requests
   - Compare cached vs server file versions
   - Test with different browsers to isolate issues

3. **Environment-Specific Checks**
   - Compare development vs production behavior
   - Verify auto-reload settings
   - Check static file serving configuration
   - Examine build process impact on caching

## Constraints

- Do not modify existing code functionality
- Do not implement or suggest fixes at this stage
- Focus solely on accurate diagnosis and evidence collection
- Document all cache-related findings separately

## Output Requirements

- Clear the terminal first (CLS) to avoid confusion with previous logs
- Add detailed, timestamped logs with contextual information
- Identify any potential failure points with confidence levels
- Document system state at critical moments in execution flow
- Include cache-specific diagnostic information:
  - Server cache status
  - Browser cache state
  - Cache headers present
  - Environment-specific caching behavior

## Note

All findings will be used to develop a targeted solution in the next phase. Cache-related issues should be documented separately to help distinguish between code and caching problems.
