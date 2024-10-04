class RadialBasisFunction {
    constructor(points, epsilon = 0.025) {
        this.points = points; // Array of THREE.Vector3 points
        this.epsilon = epsilon; // Scaling parameter for the RBF
        this.lambda = []; // RBF coefficients, to be calculated

        // Precompute the matrix A and solve for lambda using eigenvalue decomposition
        this.computeCoefficients();
    }

    // Gaussian radial basis function
    rbf(r) {
        return Math.exp(-Math.pow(this.epsilon * r, 2));
    }

    // Function to compute the Euclidean distance between two points
    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    }

    // Custom function to find the index of the smallest absolute value
    argMin(arr) {
        let minIndex = 0;
        let minValue = Math.abs(arr[0]);

        for (let i = 1; i < arr.length; i++) {
            if (Math.abs(arr[i]) < minValue) {
                minValue = Math.abs(arr[i]);
                minIndex = i;
            }
        }

        return minIndex;
    }

    // Build matrix A and solve for lambda using eigenvalue decomposition
    computeCoefficients() {
        const n = this.points.length;
        let A = math.zeros(n, n); // Create an n x n matrix filled with zeros

        // Build matrix A based on the distances between points
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                let dist = this.distance(this.points[i], this.points[j]);
                A.set([i, j], this.rbf(dist)); // Use A.set() to assign values
            }
        }

        // Perform Eigenvalue Decomposition on A
        const eig = math.eigs(A);
        const eigenvalues = eig.values;
        const eigenvectors = eig.eigenvectors;

        // Find the smallest eigenvalue (in absolute terms) and its corresponding eigenvector
        let minEigenvalueIndex = this.argMin(eigenvalues);

        // Access the corresponding eigenvector (as a column in eigenvectors)
        this.lambda = eigenvectors.map(row => row[minEigenvalueIndex]);
    }

    // Function to compute the RBF value at a new point
    evaluate(point) {
        const n = this.points.length;
        let result = 0;
        // RBF part
        for (let i = 0; i < n; i++) {
            let dist = this.distance(point, this.points[i]);
            result += this.lambda[i] * this.rbf(dist);
        }
        return result;
    }
}
