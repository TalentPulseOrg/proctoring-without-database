import { createBrowserRouter } from 'react-router-dom';
import FaceVerification from '../components/FaceVerification';

const router = createBrowserRouter([
    {
        path: '/face-verification',
        element: <FaceVerification />
    }
    // ... existing routes ...
]);

export default router; 