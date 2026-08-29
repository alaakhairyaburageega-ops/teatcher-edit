function tutorialsManager() {
    return {
        tutorials: [],
        isLoading: false,
        isAdding: false,
        isDeleting: null,
        newTutorial: {
            youtube_url: '',
            title: '',
            description: '',
            display_order: 0
        },

        init() {
            this.loadTutorials();
        },

        async loadTutorials() {
            this.isLoading = true;
            try {
                const token = sessionStorage.getItem('sea_erp_token');
                const response = await fetch('/.netlify/functions/get-tutorials', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch tutorials');
                
                this.tutorials = await response.json();
            } catch (error) {
                console.error('Error loading tutorials:', error);
                alert('Error loading tutorials. Check console for details.');
            } finally {
                this.isLoading = false;
            }
        },

        async addTutorial() {
            this.isAdding = true;
            try {
                const token = sessionStorage.getItem('sea_erp_token');
                const response = await fetch('/.netlify/functions/admin-tutorials', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...this.newTutorial,
                        display_order: parseInt(this.newTutorial.display_order) || 0
                    })
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to add tutorial');
                }

                // Reset form and reload
                this.newTutorial = { youtube_url: '', title: '', description: '', display_order: 0 };
                this.loadTutorials();
                
            } catch (error) {
                console.error('Add tutorial error:', error);
                alert(error.message);
            } finally {
                this.isAdding = false;
            }
        },

        async deleteTutorial(id) {
            if (!confirm('Are you sure you want to delete this tutorial video?')) return;
            
            this.isDeleting = id;
            try {
                const token = sessionStorage.getItem('sea_erp_token');
                const response = await fetch('/.netlify/functions/admin-tutorials', {
                    method: 'DELETE',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to delete tutorial');
                }

                this.loadTutorials();
                
            } catch (error) {
                console.error('Delete tutorial error:', error);
                alert(error.message);
            } finally {
                this.isDeleting = null;
            }
        }
    }
}
